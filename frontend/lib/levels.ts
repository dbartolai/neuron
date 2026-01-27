
type ModelLevel = {
  id: string
  title: string
  description: string
  constraints: string[]
}

export const WRITING_DEFAULT: ModelLevel = {
    id: "w-default",
    title: "Writing Assistance",
    description: "Default writing assistance configuration for Neuron.",
    constraints: [
        "This is the default writing assistance mode.",
        "Admins can customize these rules in the admin dashboard.",
        "Courses will use these default rules unless custom rules are configured."
    ]
}

export const TESTING_DEFAULT: ModelLevel = {
    id: "t-default",
    title: "Testing Assistance",
    description: "Default testing assistance configuration for Neuron.",
    constraints: [
        "This is the default testing assistance mode.",
        "Admins can customize these rules in the admin dashboard.",
        "Courses will use these default rules unless custom rules are configured."
    ]
}

export const DEBUGGING_DEFAULT: ModelLevel = {
    id: "d-default",
    title: "Debugging Assistance",
    description: "Default debugging assistance configuration for Neuron.",
    constraints: [
        "This is the default debugging assistance mode.",
        "Admins can customize these rules in the admin dashboard.",
        "Courses will use these default rules unless custom rules are configured."
    ]
}