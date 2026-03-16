export const DUMP_PROMPTS = {
    stress: [
        "What is currently making you feel overwhelmed?",
        "Describe the physical sensations of stress you're feeling right now.",
        "What is the one thing causing the most friction in your day?",
        "If you could pause one responsibility right now, what would it be?",
        "What are you tolerating that you shouldn't be?"
    ],
    thoughts: [
        "What ideas are distracting you from your main focus?",
        "List 3 things that are looping in your mind.",
        "What is a random idea you had today that you don't want to forget?",
        "What conversation are you rehearsing in your head?",
        "What is something you learned recently that stuck with you?"
    ],
    worries: [
        "What future scenario are you trying to control?",
        "What is the worst-case scenario you're afraid of?",
        "What feels uncertain right now?",
        "Who are you afraid of disappointing?",
        "What is a deadline that is looming over you?"
    ]
}

export const getRandomPrompt = (type: 'stress' | 'thoughts' | 'worries') => {
    const prompts = DUMP_PROMPTS[type]
    return prompts[Math.floor(Math.random() * prompts.length)]
}
