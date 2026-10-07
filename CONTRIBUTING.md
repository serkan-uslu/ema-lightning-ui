# Contributing

Thanks for helping improve EMA Studio! This is a community interface for the [EMA Lightning](https://huggingface.co/canberkkkkkk/ema-lightning) model; model issues belong in the [model repository](https://github.com/canberk7/ema-lightning).

## Before you start

- Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — especially the service → control → UI layering and the atomic component rules.
- Follow [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) to set up the project.
- For larger changes, open an issue first so the scope can be agreed.

## Scope

EMA Studio stays a focused, local, single-user tool. Out of scope for now: cloud inference, accounts, external databases, advanced multi-track editing and features the model does not support (voice cloning, emotion control). Do not present the model card's benchmark numbers as local measurements.

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

The pre-commit hook runs ESLint and Prettier on staged files; fix any warning it reports instead of bypassing it.

## License

By contributing, you agree that your contributions are licensed under the [Apache License 2.0](LICENSE).
