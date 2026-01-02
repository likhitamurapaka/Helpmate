class AIService {
    static async analyzeReport(report) {
        // Simulate network delay for AI processing
        return new Promise((resolve) => {
            setTimeout(() => {
                const analysis = this._simulateAnalysis(report);
                resolve(analysis);
            }, 1500 + Math.random() * 1000); // 1.5 - 2.5s delay
        });
    }

    static _simulateAnalysis(report) {
        // Deterministic simulation based on report content.
        // STRICT RULE: "Real" only if it contains: accident, fire, crime, or public infrastructure damage.

        const description = (report.description || "").toLowerCase();
        const type = (report.type || "").toLowerCase();

        // Keywords defining "Real" incidents
        const accidentKeywords = ['accident', 'crash', 'collision', 'hit', 'turnover'];
        const fireKeywords = ['fire', 'flame', 'smoke', 'explosion', 'burn'];
        const crimeKeywords = ['crime', 'fight', 'weapon', 'robbery', 'thief', 'assault', 'attack', 'gun', 'knife'];
        const damageKeywords = ['broken', 'damage', 'pothole', 'leak', 'collapse', 'crack', 'blocked', 'fallen'];
        const medicalKeywords = ['blood', 'injury', 'hurt', 'pain', 'unconscious', 'heart', 'ambulance']; // Usually associated with accidents/crime but good to have.

        // Combined "Real" keywords
        const allRealKeywords = [...accidentKeywords, ...fireKeywords, ...crimeKeywords, ...damageKeywords, ...medicalKeywords];

        // 1. Detect Real vs Fake
        let isReal = false;
        let confidence = 0.60; // Default low confidence

        // Check against "Real" criteria
        if (allRealKeywords.some(kw => description.includes(kw) || type.includes(kw))) {
            isReal = true;
            confidence = 0.85 + Math.random() * 0.14; // High confidence
        } else {
            // Check for explicit "fake" keywords usually for testing, or just default to fake
            if (description.includes('test') || description.includes('fake') || description.includes('prank')) {
                confidence = 0.99;
            } else {
                // If it doesn't match any emergency keywords, it's considered "Fake" (irrelevant/spam) by the new strict rule.
                confidence = 0.80;
            }
        }

        // 2. Determine Priority
        // High: Health (Medical), Crime, Fire
        // Medium: Damage/Infrastructure
        // Low: Others or Fake

        let priority = 'LOW';
        let reasoning = [];

        if (isReal) {
            const isFire = fireKeywords.some(kw => description.includes(kw) || type.includes(kw));
            const isCrime = crimeKeywords.some(kw => description.includes(kw) || type.includes(kw));
            const isMedical = medicalKeywords.some(kw => description.includes(kw) || type.includes(kw));
            const isAccident = accidentKeywords.some(kw => description.includes(kw) || type.includes(kw));

            if (isFire || isCrime || isMedical || isAccident) {
                priority = 'HIGH';
                reasoning.push('Critical emergency detected (Fire/Crime/accident).');
            } else if (damageKeywords.some(kw => description.includes(kw) || type.includes(kw))) {
                priority = 'MEDIUM';
                reasoning.push('Infrastructure damage detected.');
            } else {
                priority = 'LOW'; // Should basically not happen if isReal logic is tight
                reasoning.push('Verified incident but low urgency.');
            }
        } else {
            priority = 'LOW';
            reasoning.push('Report flagged as Irrelevant/Fake.');
        }

        return {
            isReal,
            confidence: parseFloat(confidence.toFixed(2)),
            priority,
            reasoning: reasoning.join(' '),
            version: 2 // Increment to force re-analysis on old reports
        };
    }
}
