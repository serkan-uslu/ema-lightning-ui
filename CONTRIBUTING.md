# Contributing

Thanks for helping improve EMA Studio! This is a community interface for the [EMA Lightning](https://huggingface.co/canberkkkkkk/ema-lightning) model; model issues belong in the [model repository](https://github.com/canberk7/ema-lightning).

## Before you start

- Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — especially the service → control → UI layering and the atomic component rules.
- Follow [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) to set up the project.
- For larger changes, open an issue first so the scope can be agreed.

## Scope

EMA Studio stays a focused, local, single-user tool. Out of scope for now: cloud inference, accounts, external databases, advanced multi-track editing and features the model does not support (voice cloning, emotion control). Do not present the model card's benchmark numbers as local measurements.

## Issues

Use the [issue chooser](https://github.com/serkan-uslu/ema-lightning-ui/issues/new/choose) to report a bug or request a feature. Reports in English or Turkish are welcome; search existing issues before opening a new one.

- **Bug report:** include what happened, reproducible steps, expected behavior, and your environment (OS, browser, app version or commit, Node.js/Python versions, and CPU/CUDA when relevant). Add logs or screenshots if useful, removing private project text, personal data and secrets.
- **Feature request:** explain the problem or use case and the behavior you want. Include alternatives or workarounds when helpful.
- Blank issues remain available for questions or topics that do not fit either form.

## Pull requests

1. Keep changes small and focused; match the existing patterns.
2. Put every user-facing string in both `src/i18n/tr.ts` and `src/i18n/en.ts`.
3. Run before pushing:

   ```bash
   npm run check
   npm run build
   npm run test:backend   # when backend code changes
   ```

4. Describe what you tested manually (see the checklist in `docs/DEVELOPMENT.md`).
5. Never commit `data/`, `.env*`, model weights, API keys or other secrets.

The pull request template asks for the reason for the change, validation results, and relevant documentation or interface updates. Mark checks you could not run clearly.

The pre-commit hook runs ESLint and Prettier on staged files; fix any warning it reports instead of bypassing it.

## License

By contributing, you agree that your contributions are licensed under the [Apache License 2.0](LICENSE).
