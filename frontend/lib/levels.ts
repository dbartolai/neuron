
type ModelLevel = {
  id: string
  idx: number
  title: string
  description: string
  constraints: string[]
}

export const WRITING_LEVELS: ModelLevel[] = [
    {
        id: "w-0",
        idx: 0,
        title: "Level 0: Disabled",
        description: "Disable AI code creation functionality for students.",
        constraints: [
            "Still get access to all of Neuron's instructor-student communication features.",
            "Allow students to view course materials and ask questions directly to course staff.",
            "Increase AI functionality at a later date if desired.",
            "Disable code creation functionality while onboarding students."
        ]
    },
    {
        id: "w-1",
        idx: 1,
        title: "Level 1: Conceptual",
        description: "Access course materials and provide conceptual asistance",
        constraints: [
            "Answers conceptual questions as a TA or professor would.",
            "Cannot analyze or output code, pseudocode, or algorithmic steps.",
            "Best for foundational learning in low-level or fundamental courses.",
            "Full access to provided course materials for conceptual and architectural understanding. "
        ]
    },
    {
        id: "w-2",
        idx: 2,
        title: "Level 2: Algorithmic",
        description: "Intoduces algorithmic reasoning without any code/pseudocode",
        constraints: [
            "Cannot analyze any code from user input or produce code as output.",
            "May only provide conceptual assistance and walk students through algorithms at a high level.",
            "Designed to promote an understanding of data structures, memory, and algorithms without spoiling solutions.",
            "Encourages students to reason and ask about algorithms within the guidelines of the course. "
        ]
    },
    {
        id: "w-3",
        idx: 3,
        title: "Level 3: Pseudocode",
        description: "Provides pseudocode given a sufficient understanding from user",
        constraints: [
            "Incites curiosity and deep reasoning from the student to the point of clear understanding.",
            "Helps the student conceptually with verbal answers and pseudocode, one function at a time.",
            "Does not help with architectural decision-making (i.e. calls to other functions/modules not already explained by student).",
            "Still will not review or analyze any code provided by students."
        ]
    },
    {
        id: "w-4",
        idx: 4,
        title: "Level 4: Architecture",
        description: "Assist with architectural decisions without providing code solutions.",
        constraints: [
            "Everything from level 3 plus reasoning through other function/module integrations.",
            "Helps students design logic for functions and classes that work together.",
            "Especially useful for explaining some functions that don't return, work concurrently, etc.",
            "Does not input or output any code to/from students."
        ]
    },
    {
        id: "w-5",
        idx: 5,
        title: "Level 5: Functions",
        description: "Hides code generation behind understanding",
        constraints: [
            "Given concrete understanding of what needs to happen, Neuron will generate a function for the student",
            "The student needs to first demonstrate understanding, explain clearly the specification, and integrate the solution.",
            "Will not introduce any logic that the student has not specifically requested.",
            "Still will not analyze any code provided by students."
        ]
    },
    {
        id: "w-6",
        idx: 6,
        title: "Level 6: System",
        description: "Disable AI code creation functionality for students.",
        constraints: [
            "Still get access to all of Neuron's instructor-student communication features.",
            "Allow students to view course materials and ask questions directly to course staff.",
            "Increase AI functionality at a later date if desired.",
            "Disable code creation functionality while onboarding students."
        ]
    },
    {
        id: "w-7",
        idx: 7,
        title: "Level 7: Unguarded",
        description: "Teach students how to work with a full-fledged coding assistant.",
        constraints: [
            "Allow students to input code for analysis with unrestricted outputs.",
            "Customize your own rules as an instructor.",
            "Allow full AI functionality to students for learning, experimenting, and understanding weaknesses.",
            "Still retain access to student activity, common pain points, and errata.",
        ]
    }
]

export const TESTING_LEVEL: ModelLevel[] = [
    {
        id: "t-0",
        idx: 0,
        title: "Level 0: Disabled",
        description: "Disable AI test case functionality for students.",
        constraints: [
            "Still get access to all of Neuron's instructor-student communication features.",
            "Allow students to view course materials and ask questions directly to course staff.",
            "Increase AI functionality at a later date if desired.",
            "Students must formulate and write their own test cases."
        ]
    },
    {
        id: "t-1",
        idx: 1,
        title: "Level 1: Specs",
        description: "Stimulate ideas for test cases.",
        constraints: [
            "If students can verbally explain their code, Neuron will provide the specs for test cases",
            "Specs will be based upon course context and verbal explanations.",
            "Neuron will not output any logic or code alongside the test case specs.",
            "Ideal for providing a starting point for students as they test their code."
        ]
    },
    {
        id: "t-2",
        idx: 2,
        title: "Level 2: Logic",
        description: "Provide general logic for test cases.",
        constraints: [
            "If students can verbally explain their code, Neuron will provide the logic for test cases",
            "Logic will be based on verbal explanations and course context.",
            "Neuron will not output any code alongside the test case specs and logic.",
            "Gives students more guidance as they write test cases, while still stimulating reasoning and thought."
        ]
    },
    {
        id: "t-3",
        idx: 3,
        title: "Level 3: Tailored",
        description: "Provide custom logic for test cases given student code.",
        constraints: [
            "Students can copy and paste single methods along with desired inputs, outputs, and behavior.",
            "Neuron will provide logic/steps for test cases that test for correct behavior.",
            "Neuron will not output any code alongside the test case logic.",
            "Reduces friction between code and testing, but still requires conversion of logic to code."
        ]
    },
    {
        id: "t-4",
        idx: 4,
        title:"Level 4: Code",
        description: "Provide test cases for individual methods.",
        constraints: [
            "Students can copy and paste single methods along with desired inputs, outputs, and behavior.",
            "Neuron will provide test cases that test for correct behavior.",
            "Neuron will not provide a test suite in this mode, and students must still reason about prompt.",
            "Further reduces friction between code and testing."
        ]
    },
    {
        id: "t-5",
        idx: 5,
        title: "Level 5: Suite",
        description: "Provides entire test suites.",
        constraints: [
            "Students can copy and paste entire modules along with desired inputs, outputs, and behavior.",
            "Neuron will provide test cases that test for correct behavior.",
            "An entire test suite will be generated, but students are still encouraged to read through the code.",
            "Put the emphasis more on writing/debugging, but be careful. AI is far from perfect."
        ]
    }
]

export const DEBUGGING_LEVELS: ModelLevel[] = [
    {
        id: "d-0",
        idx: 0,
        title: "Level 0: Disabled",
        description: "Disable AI debugging functionality for students.",
        constraints: [
            "Still get access to all of Neuron's instructor-student communication features.",
            "Allow students to view course materials and ask questions directly to course staff.",
            "Increase AI functionality at a later date if desired.",
            "Students must debug their own code."
        ]
    },
    {
        id: "d-1",
        idx: 1,
        title: "Level 1: Verbal",
        description: "Students must verbally explain their code.",
        constraints: [
            "Neuron will not accept any code pasted in by students.",
            "Students must explain their code verbally and ask specific comceptual questions.",
            "Neuron will not output any code or pseudocode and debugging is strictly conversational.",
            "Encourages students to use traditional debugging tools such as print statements or debuggers."
        ]
    },
    {
        id: "d-2",
        idx: 2,
        title: "Level 2: TA-Like",
        description: "Students may input code but output is verbal",
        constraints: [
            "Cannot directly fix code or point out issues; uses student code for context only.",
            "Explains conceptually what a misunderstanding could be (TA-like responses).",
            "Encourages testing and traditional debugging methods to get more information.",
            "Students ultimately are still debugging their own code with assistance."
        ]
    },
    {
        id: "d-3",
        idx: 3,
        title: "Level 3: Highlighter",
        description: "Points to issues but won't fix them.",
        constraints: [
            "Neuron can attempt to pinpoint where the bug is in a student function/method.",
            "Cannot output code, so it will explain verbally or with pseudocode how to fix the error.",
            "This makes debugging simple for off-by-one errors, but dificult for lack of understanding.",
            "Students still need to formulate and implement any changes to the code."
        ]
    },
    {
        id: "d-4",
        idx: 4,
        title: "Level 4: Code Out",
        description: "Receive code solutions for single functions.",
        constraints: [
            "Student can input one single function with relevant verbal context.",
            "Neuron will attempt to debug the function as it stands on its own, but won't help with architecture.",
            "This is useful for smaller errors in computations and some conceptual/algorithmic misudnerstandings.",
            "Students still need to figure out how to fit a function/method into the bigger system."
        ]
    },
    {
        id: "d-5",
        idx: 5,
        title: "Level 5: All Hands",
        description: "Students use the full model for debugging.",
        constraints: [
            "Try the model with no restrictions.",
            "Useful for learning where AI can help and where it falls short in debugging.",
            "Still incentivises writing smaller test cases or adding print statements.",
            "Helps students get to the right answer without worrying about reasoning/learning."
        ]
    },
]