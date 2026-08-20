LuxOS GitHub Actions build fix

Replace these files in your LuxOS repo:
- tsconfig.app.json
- tsconfig.node.json

Add this new file:
- src/vite-env.d.ts

Then commit and push. GitHub Actions should rerun automatically.
