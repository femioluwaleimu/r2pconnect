ALTER TABLE research_chapter_reviews
    ADD COLUMN IF NOT EXISTS academic_clarity_score INT NULL AFTER rating,
    ADD COLUMN IF NOT EXISTS recommendations JSON NULL AFTER weak_areas,
    ADD COLUMN IF NOT EXISTS examiner_readiness VARCHAR(50) NULL AFTER optional_improvements,
    ADD COLUMN IF NOT EXISTS why_it_matters JSON NULL AFTER examiner_readiness,
    ADD COLUMN IF NOT EXISTS examiner_expectations JSON NULL AFTER why_it_matters,
    ADD COLUMN IF NOT EXISTS generic_examples JSON NULL AFTER examiner_expectations,
    ADD COLUMN IF NOT EXISTS methodology_alignment INT NULL AFTER generic_examples,
    ADD COLUMN IF NOT EXISTS style_match_score INT NULL AFTER methodology_alignment,
    ADD COLUMN IF NOT EXISTS ai_confidence_explanation LONGTEXT NULL AFTER ai_confidence_score;
