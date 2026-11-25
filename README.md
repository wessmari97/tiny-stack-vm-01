# tiny-stack-vm

![make.fun](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/wessmari97/tiny-stack-vm-01/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard)
![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/wessmari97/tiny-stack-vm-01/reward.svg)

A tiny stack VM for the [tiny-stack-vm-01-run-20261122](https://make.fun/bounty/tiny-stack-vm-01-run-20261122) bounty on make.fun. `main.ts` runs every program in the input dir and writes stdout.bin + exit.txt per id. It implements the ISA fully, including every hard rule: exact 32-bit wrapping multiply, unsigned DIV/MOD/LT, the -2147483648 edge cases, 5-bit shift counts, PUSH8 sign extension, EXIT low byte, and all ten traps with their own exit codes. Practice set: 40/40, score 1,000,000.

Built for the make.fun bounty by [@mase-ayas](https://make.fun/r/jrnh2cfm?ref=jrnh2cfm). Practice set: 40/40 correct, 1,000,000 points — above the house baseline.
