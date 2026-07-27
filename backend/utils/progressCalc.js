const DEFAULT_TARGET_MINUTES = 1000;

const calculateCompletionPercentage = (totalStudyTime, targetMinutes) => {
    const target = Number(targetMinutes) || DEFAULT_TARGET_MINUTES;
    let percentage = (totalStudyTime / target) * 100;

    if (percentage > 100) {
        percentage = 100;
    }

    return Number(percentage.toFixed(2));
};

module.exports = {
    DEFAULT_TARGET_MINUTES,
    calculateCompletionPercentage
};
