UPDATE research_chapter_reviews
SET
    why_it_matters = JSON_ARRAY(
        'This matters academically because examiners use the chapter to judge whether the study has a clear problem, defensible scope, and logical research direction.',
        'A stronger academic structure helps the supervisor confirm that the chapter can support the methodology, analysis, and final conclusions.'
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE why_it_matters IS NULL OR JSON_LENGTH(why_it_matters) = 0;

UPDATE research_chapter_reviews
SET
    examiner_expectations = CASE
        WHEN LOWER(chapter_name) LIKE '%methodology%' THEN JSON_ARRAY(
            'A clear research design that matches the topic, objectives, and research questions.',
            'A justified population, sample, sampling technique, and data collection method.',
            'Enough procedural detail for another researcher to understand how the study would be carried out.'
        )
        WHEN LOWER(chapter_name) LIKE '%literature%' THEN JSON_ARRAY(
            'A thematic review that connects sources to the study rather than listing authors one after another.',
            'A clear research gap showing what previous studies have not fully addressed.',
            'Recent, relevant, and properly connected literature that supports the study objectives.'
        )
        ELSE JSON_ARRAY(
            'A clear statement of the problem that shows why the study is necessary.',
            'Research objectives and questions that align with each other and with the title.',
            'A scope, significance, and definition of terms that make the study focused and examinable.'
        )
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE examiner_expectations IS NULL OR JSON_LENGTH(examiner_expectations) = 0;
