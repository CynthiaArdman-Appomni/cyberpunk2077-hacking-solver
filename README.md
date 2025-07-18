# cyberpunk-2077-hacking-solver

A web-based solver for the Cyberpunk 2077 Breach Protocol hacking minigame. [**Try it online.**](https://ncrpdive.com/)
A GM puzzle generator is available at /gm where you can configure grid size, time limit and daemon details. After generating a puzzle, a shareable link is provided so you can play it later or send it to friends.

![](https://raw.githubusercontent.com/cxcorp/cyberpunk2077-hacking-solver/main/doc-images/screencap.gif)

Follow my progress on an automated code matrix reader (client-side JS only - OpenCV.js & Tesseract.js) here: https://github.com/cxcorp/cyberpunk2077-hacker-camera-proto

## Development
This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

### Getting Started

First, install [node.js](https://nodejs.org/en/download/).

Then, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

### Testing
Any tests under `__tests__` will be run when executing `npm run test`.

When executing `npm run test:watch`, the Jest CLI is invoked with the `--watch` option ([see here](https://jestjs.io/docs/en/cli#--watch])).

While watch is running the following commands may be used:
```bash
Watch Usage
 › Press a to run all tests.
 › Press f to run only failed tests.
 › Press p to filter by a filename regex pattern.
 › Press t to filter by a test name regex pattern.
 › Press q to quit watch mode.
 › Press Enter to trigger a test run.
```

#### TSLint
Run [TSLint](https://palantir.github.io/tslint/) for suggestions on a given file or directory, for example:
```bash
$ tslint -c tslint.json './lib/**/*.ts'
```

TSLint also has plugins to enable highlighting (and often automatically fixing) issues in a number of popular IDEs:
- [VS Code](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-tslint-plugin)
- [WebStorm, IntelliJ, etc](https://www.jetbrains.com/help/webstorm/using-tslint-code-quality-tool.html)
- [Atom](https://atom.io/packages/linter-tslint)

### Logs
Server-side operations and errors are printed to the console. The previous behaviour of writing logs to an `app.log` file has been removed to better support read‑only environments. The logger is loaded only on the server so browser bundles remain small and free of Node.js dependencies. Log output includes additional details about invalid API requests, puzzle generation failures and timer updates so that issues can be diagnosed from Netlify function logs or the local console.

### Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## License

This project is licensed under the Apache 2.0 License. See [LICENSE](https://github.com/cxcorp/cyberpunk2077-hacking-solver/blob/main/LICENSE) and [NOTICE](https://github.com/cxcorp/cyberpunk2077-hacking-solver/blob/main/NOTICE) for details.
