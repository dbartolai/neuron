# Neuron

*An instructor-controlled chatbot tool for academic integrity. Focusing on prompting AI to enforce specific pedagogy.

### What is Neuron?

Last semester, I was thinking that AI use in the classroom is a double edged sword. On one hand, students are using Ai models that have no context of the course. They might be getting answers that aren't correctly scoped to the materials, and they need to re-explain everything each time. On the other, professors don't know what students are using AI for. It could be writing an entire essay/codebase, or maybe it's just quizzing the student before an exam. 

I designed Neuron to target these issues. The professor could add in their own prompt or choose from pre-selected guardrails. They can also upload course context. PDFs, lecture notes, and problem sets can be posted so students can access them more easily and AI can read them directly. In my head, the combination of perfect context and instructor guardrails was perfect for university. All the student would need to do is say "Quiz me on homework 3 material" and get questions without being given the answers.

### What I Learned

**Product:** While making this, I learned to not sink time into things people don't want. The product worked really well. I was working on a langchain chat process that could look up the information from context. But as I was finishing up, I emailed dozens of professors and got exactly zero interest. That was quite demotivating so I decided to place my time into a different kind of project. Now I only work on things where I would be the target customer. Because then I know it provides value. Even if it's not interesting to anybody else, I can at least use and iterate on it myself.

**Tech:** I learned a lot making this project. I wrote the whole chat by hand without using AI. I didn't use AI to code until I had a working chatbot. This took surprisingly long. I originally used the OpenAI api, React.TS, and FastAPI. I used a React hook for the chat window state, and everything else was pretty standard. What I found is that getting the functionality wasn't really the hard part. It got difficult making it usable. Implementing streaming so I didn't need to refresh every time, getting nice typing animations, and even getting the LLM-generated markdown/code blocks to look nice. It was a lot of wrestling with different CSS classes. The trickiest part was that you didn't know what the LLM would output or if it would fit the mold you expected, and this was in December 2025 when I was primarily building. Models have gotten *much* more reliable since then, and I feel this would be a lot easier now. But at the time I was definitely struggling.