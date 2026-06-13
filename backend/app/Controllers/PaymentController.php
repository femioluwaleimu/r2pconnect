<?php
/**
 * Payment Controller (Paystack Integration)
 */

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Response;
use App\Models\Wallet;

class PaymentController extends Controller {
    private Wallet $walletModel;
    private string $paystackSecret;

    public function __construct() {
        parent::__construct();
        $this->walletModel = new Wallet();
        $this->paystackSecret = env('PAYSTACK_SECRET_KEY', '');
    }

    /**
     * Initialize payment (create transaction)
     */
    public function initiate(): void {
        $this->requireAuth();

        if (!$this->validate([
            'amount' => 'required',
            'email' => 'required|email',
        ])) {
            return;
        }

        try {
            $user = $this->getUser();
            $amount = (float)$this->input('amount');
            $email = $this->input('email');
            $reference = uniqid('pst_');

            // Validate amount
            if ($amount <= 0 || $amount > 10000000) {
                Response::error('Invalid amount', 400);
                return;
            }

            // Create payment record
            $sql = "
                INSERT INTO payments (id, user_id, amount, email, reference, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'pending', ?)
            ";

            $this->db->execute($sql, [
                generateUUID(),
                $user['sub'],
                $amount,
                $email,
                $reference,
                date('Y-m-d H:i:s')
            ]);

            // Call Paystack API to initialize transaction
            $response = $this->initializePaystackTransaction($email, $amount, $reference);

            if ($response['status']) {
                Response::success([
                    'authorization_url' => $response['data']['authorization_url'],
                    'access_code' => $response['data']['access_code'],
                    'reference' => $response['data']['reference'],
                ]);
            } else {
                Response::error('Failed to initialize payment', 500);
            }
        } catch (\Exception $e) {
            error_log("Initiate payment error: " . $e->getMessage());
            Response::error('Failed to initiate payment', 500);
        }
    }

    /**
     * Verify payment
     */
    public function verify(): void {
        if (!$this->validate(['reference' => 'required'])) {
            return;
        }

        try {
            $reference = $this->input('reference');

            // Verify with Paystack
            $verifyResponse = $this->verifyPaystackTransaction($reference);

            if (!$verifyResponse['status']) {
                Response::error('Payment verification failed', 400);
                return;
            }

            $data = $verifyResponse['data'];

            if ($data['status'] === 'success') {
                // Get payment from database
                $sql = "SELECT * FROM payments WHERE reference = ?";
                $payment = $this->db->getOne($sql, [$reference]);

                if (!$payment) {
                    Response::error('Payment record not found', 404);
                    return;
                }

                // Update payment status
                $sql = "UPDATE payments SET status = 'completed', updated_at = ? WHERE id = ?";
                $this->db->execute($sql, [date('Y-m-d H:i:s'), $payment['id']]);

                // Add funds to wallet
                $this->walletModel->addFunds(
                    $payment['user_id'],
                    $payment['amount'],
                    $reference,
                    'paystack_topup'
                );

                Response::success([
                    'payment_id' => $payment['id'],
                    'amount' => $payment['amount'],
                    'status' => 'completed'
                ], 'Payment verified successfully');
            } else {
                Response::error('Payment was not successful', 400);
            }
        } catch (\Exception $e) {
            error_log("Verify payment error: " . $e->getMessage());
            Response::error('Failed to verify payment', 500);
        }
    }

    /**
     * Handle Paystack webhook (IPN)
     */
    public function webhook(): void {
        // Verify webhook signature
        $signature = $_SERVER['HTTP_X_PAYSTACK_SIGNATURE'] ?? '';
        $body = file_get_contents('php://input');
        $hash = hash_hmac('sha512', $body, $this->paystackSecret);

        if ($signature !== $hash) {
            http_response_code(401);
            exit;
        }

        try {
            $event = json_decode($body, true);

            if ($event['event'] === 'charge.success') {
                $data = $event['data'];
                $reference = $data['reference'];

                // Get payment
                $sql = "SELECT * FROM payments WHERE reference = ?";
                $payment = $this->db->getOne($sql, [$reference]);

                if ($payment && $payment['status'] === 'pending') {
                    // Update payment status
                    $sql = "UPDATE payments SET status = 'completed', updated_at = ? WHERE id = ?";
                    $this->db->execute($sql, [date('Y-m-d H:i:s'), $payment['id']]);

                    // Add funds to wallet
                    $this->walletModel->addFunds(
                        $payment['user_id'],
                        $payment['amount'],
                        $reference,
                        'paystack_webhook'
                    );

                    // Log webhook
                    log_message('info', "Webhook processed: Payment {$payment['id']} completed");
                }
            }

            http_response_code(200);
            exit;
        } catch (\Exception $e) {
            error_log("Webhook error: " . $e->getMessage());
            http_response_code(500);
            exit;
        }
    }

    /**
     * Get payment history
     */
    public function getHistory(): void {
        $this->requireAuth();

        try {
            $user = $this->getUser();
            $limit = (int)$this->input('limit', 20);
            $offset = (int)$this->input('offset', 0);

            $sql = "
                SELECT * FROM payments
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ";

            $payments = $this->db->getAll($sql, [$user['sub'], $limit, $offset]);

            Response::success($payments);
        } catch (\Exception $e) {
            error_log("Get payment history error: " . $e->getMessage());
            Response::error('Failed to get payment history', 500);
        }
    }

    /**
     * Initialize Paystack transaction
     */
    private function initializePaystackTransaction(string $email, float $amount, string $reference): array {
        $amount_kobo = intval($amount * 100); // Paystack expects amount in kobo

        $curl = curl_init();

        curl_setopt_array($curl, array(
            CURLOPT_URL => "https://api.paystack.co/transaction/initialize",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_POSTFIELDS => json_encode([
                'amount' => $amount_kobo,
                'email' => $email,
                'reference' => $reference,
                'metadata' => [
                    'user_id' => $this->getUser()['sub'] ?? null,
                ]
            ]),
            CURLOPT_HTTPHEADER => array(
                "Authorization: Bearer " . $this->paystackSecret,
                "Content-Type: application/json",
            ),
        ));

        $response = curl_exec($curl);
        $err = curl_error($curl);

        curl_close($curl);

        if ($err) {
            error_log("Paystack API error: $err");
            return ['status' => false];
        }

        return json_decode($response, true);
    }

    /**
     * Verify Paystack transaction
     */
    private function verifyPaystackTransaction(string $reference): array {
        $curl = curl_init();

        curl_setopt_array($curl, array(
            CURLOPT_URL => "https://api.paystack.co/transaction/verify/" . urlencode($reference),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "GET",
            CURLOPT_HTTPHEADER => array(
                "Authorization: Bearer " . $this->paystackSecret,
            ),
        ));

        $response = curl_exec($curl);
        $err = curl_error($curl);

        curl_close($curl);

        if ($err) {
            error_log("Paystack API error: $err");
            return ['status' => false];
        }

        return json_decode($response, true);
    }
}
