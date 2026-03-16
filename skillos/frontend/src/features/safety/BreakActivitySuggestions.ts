export type BreakType = 'micro' | 'short' | 'long'

export const BreakActivities = {
    micro: [
        "Look at something 20 feet away for 20 seconds.",
        "Close your eyes and take 3 deep breaths.",
        "Roll your shoulders backwards 5 times.",
        "Blink rapidly for 10 seconds to moisten eyes.",
        "Stretch your neck gently to the left and right."
    ],
    short: [
        "Stand up and touch your toes.",
        "Walk to the kitchen and get a glass of water.",
        "Do 10 jumping jacks.",
        "Stretch your arms above your head for 15 seconds.",
        "Look out a window and find 3 green things."
    ],
    long: [
        "Leave your desk. Go outside if possible.",
        "Make a cup of tea or coffee slowly.",
        "Listen to one favorite song with eyes closed.",
        "Do a quick mindful meditation session.",
        "Tidy up your physical workspace."
    ]
}

export const getSuggestion = (type: BreakType): string => {
    const list = BreakActivities[type]
    return list[Math.floor(Math.random() * list.length)]
}
