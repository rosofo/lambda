# Lambda Calculus in Typescript
A lambda calculus interpreter written in typescript with a basic web interface.

Uses the parsimmon parser combinator library.

# Story
The [lambda calculus](https://www.inf.fu-berlin.de/lehre/WS03/alpi/lambda.pdf)
is a foundational programming language. Its only values are functions
and the only thing that can take place is function application. Other types of
values can be represented and manipulated adhoc, for instance the natural
numbers can be defined as a successor function and a zero function. Even
recursion can be implemented using the famous [Y-combinator](https://mvanier.livejournal.com/2897.html).

Because of this the lambda calculus is, surprisingly,
[turing complete](https://simple.wikipedia.org/wiki/Turing_complete).
It underpins much of the theory and practice of functional programming.

I decided to write an interpreter because it would be a neat way to get into the basics
of parsing and evaluating programs. I also took it as an opportunity to get into
the habit of automated testing, enforcing much needed rigour and avoiding a lot of
tedium.

Some scattered thoughts:

- Ironically I wrote this in a mostly non-functional way. I'm still learning js/ts so I didn't want to use a functional library yet.
- Writing the parser quickly became a priority as I realised it's also a development
tool. Writing object literals for tests was cumbersome.
- The contrast between the way the parser combinator library allowed me to manage
complexity, and my originally monolithic evaluator function, emphasised
the need for composibility and abstraction at every step. Thinking imperatively is
often necessary, but it's best to start out at a higher level than that.
- Typescript's type system is a godsend, but the inference needs improving.
- The fact that I can't use recursion to think _recursively_ about a _recursive_ data
structure (the syntax tree) because the language isn't optimised for it is frustrating.
- Drawing diagrams helps to reason
- Approach problems mathematically: break down into simpler cases. Ask questions.
The worst thing to do when my mind goes blank is to wait for insights.
- If all else fails, make tea.
