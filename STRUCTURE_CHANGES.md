# Project Structure Improvements

## Changes Made

The codebase organization has been improved by relocating files to more logical locations:

### 1. Core Operation Scripts

- Moved basic operation scripts from `/shared/` to `/core/operations/`
  - `hack.js` - Simple hack operation
  - `grow.js` - Simple grow operation
  - `weaken.js` - Simple weaken operation

### 2. Worker Scripts

- Moved worker script from `/shared/` to `/core/workers/`
  - `worker.js` - Main worker script that coordinates operations

### 3. Updated References

- All code references to these files have been updated throughout the codebase
- The main script now looks for these files in their new locations
- The resource manager modules now reference the new paths

### 4. Documentation

- Added README files to explain the purpose of each directory
- Added a MOVED.md file in the shared directory for reference

## Benefits

This new structure provides several benefits:

1. **Better Organization**: Core functionality is now grouped together in the core directory
2. **Clearer Separation of Concerns**: Operations are separate from workers
3. **More Intuitive Structure**: The folder names better reflect the purpose of the files
4. **Easier Maintenance**: Related files are grouped together
5. **Better Scalability**: Easier to add new operations or worker types in the future

## Next Steps

You can safely delete the original files from the `/shared/` directory once you've confirmed everything works correctly.
