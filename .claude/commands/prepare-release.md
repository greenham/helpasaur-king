# Prepare Release

You are preparing a new release for this project. Follow these steps carefully:

## 1. Parse Command Arguments
Check if the user provided a version number as an argument (e.g., `/prepare-release 1.10.0`).
- If provided, use that version number
- If not provided, you will determine it intelligently in step 4

## 2. Identify Current Version
Read the @CHANGELOG.md file and identify the most recent version number at the top of the file.

## 3. Generate Change Summary
Run `git diff <latest-version-tag>..main --stat` to see what has changed since the last release.
Then run `git log <latest-version-tag>..main --oneline` to see the commit messages.

## 4. Determine Next Version
If the user didn't specify a version number, analyze the changes to determine the appropriate version bump:

**Semantic Versioning Rules:**
- **MAJOR (X.0.0)**: Breaking changes, removal of features, major architectural changes
- **MINOR (0.Y.0)**: New features, new functionality, substantial improvements
- **PATCH (0.0.Z)**: Bug fixes, small improvements, dependency updates, documentation

**Decision Process:**
1. Look for breaking changes or removed features → MAJOR bump
2. Look for new features or significant functionality → MINOR bump  
3. Everything else (fixes, refactors, deps, docs) → PATCH bump

Present your reasoning to the user:
```
Based on the changes since version X.Y.Z:
- [List key changes and their impact]

Recommended version: X.Y.Z (MAJOR/MINOR/PATCH bump)
Reason: [Explain why this version increment is appropriate]

Do you want to proceed with version X.Y.Z? (yes/no/specify different version)
```

Wait for user confirmation before proceeding.

## 5. Categorize Changes
Based on the diff and commit log, categorize the changes into appropriate sections:
- **Features**: New functionality added
- **Bug Fixes**: Issues resolved
- **Performance**: Optimizations and improvements
- **Refactor**: Code improvements without changing functionality
- **Documentation**: Documentation updates
- **Infrastructure**: Build, deployment, or tooling changes
- **Dependencies**: Package updates

## 6. Update CHANGELOG
Add a new version entry to @CHANGELOG.md following this format:

```markdown
## X.Y.Z

_YYYY-MM-DD_

### What's Changed

#### [Category Name]

- Brief description of change by @author
- Another change description by @author

**Full Changelog**: https://github.com/greenham/helpasaur-king/compare/[previous-version]...[new-version]
```

## 7. Bump Version
After updating the CHANGELOG, run the version bump script with the confirmed version number as an argument:
```bash
pnpm version:bump <version>
```

For example:
```bash
pnpm version:bump 1.10.0
```

This will update the version in all package.json files across the workspace.

## 8. Final Review
Show the user:
1. The new CHANGELOG entry you've added
2. The new version number applied
3. A list of all package.json files that were updated

Ask for final confirmation before committing any changes.

## Important Notes
- Group related changes together for clarity
- Use clear, concise descriptions
- Credit contributors using GitHub username format (@username)
- Include PR numbers when available (#123)
- Focus on user-facing changes rather than internal implementation details