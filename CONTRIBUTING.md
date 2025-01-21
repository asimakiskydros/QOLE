# Contributing to QOLE

Thank you for your interest in contributing to QOLE! We welcome all contributions, whether they are bug reports, feature requests, documentation improvements, or code changes.

## How to Contribute

### Reporting Issues
- Check if the issue has already been reported in the [Issues section](https://github.com/asimakiskydros/QOLE/issues).
- If not, create a new issue and provide as much detail as possible, including steps to reproduce the issue.
- Use clear and descriptive titles.

### Submitting Pull Requests
1. **Fork** the repository.
2. **Create a new branch** (`git checkout -b feature-name`).
3. **Make your changes** and ensure they adhere to the coding guidelines.
4. **Commit your changes** (`git commit -m "feat: Add feature X"`).
5. **Push to your fork** (`git push origin feature-name`).
6. **Open a pull request** in the main repository.
7. Ensure that all tests pass before requesting a review.

## Code Guidelines

### Style Guide
- Minimize redundant {braces}.
- Give {braces} their own lines.
- Use CamelCase naming conventions.
- Use 4 spaces for indentation.
- Ensure your code is well-documented and readable.

### Commit Message Format
Use the following format for commit messages:
```
<type>: <short description>
```
Example:
- `feat: Add new feature`
- `fix: Resolve issue #123`
- `docs: Update README`

## Setting Up the Project

To set up the development environment:
```sh
# Clone the repository
git clone https://github.com/asimakiskydros/QOLE.git
cd QOLE

# Install dependencies
npm install

# Run the project
npm start
```

## Running Tests
Ensure that all tests pass before submitting a PR:
```sh
# terminal based
npm test

# log based
npm run test:custom

# debug mode
npm run test:debug
```

## Code of Conduct
By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

---

We appreciate your contributions and look forward to working with you! 🎉

