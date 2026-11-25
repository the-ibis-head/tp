// Shared flag definitions used by command specs. Do not edit by hand.

export const _RESOURCES_SUBCOMMAND_ARG = { flags: ["subcommand"], nargs: "?", default: "skills", help: "Scope: 'skills' (default) or 'research'" };

export const _RESOURCES_ACTION_ARG = { flags: ["action"], nargs: "?", default: "courses", help: "Resource type (articles, audiobooks, books, courses, magazines, podcasts, and videos)" };

export const _RESOURCES_CATEGORY_FLAG = { flags: ["--category"], metavar: "CATEGORY", nargs: "+", default: null, help: "Only include items in these categories (exact match; supersedes --filter)" };

export const _ZIP_SUBCOMMAND_ARG = { flags: ["subcommand"], metavar: "FOLDER", nargs: "*", default: [], help: "Folder to zip, plus optional --output/-o <zipfile>" };

export const _RESOURCES_DOWNLOAD_FLAG = { flags: ["--download"], action: "store_true", default: false, help: "Download missing items (articles, courses, and videos)" };

export const _RESOURCES_MISSING_FLAG = { flags: ["--missing"], action: "store_true", default: false, help: "Show only resources not yet downloaded" };

export const _FILTER_FLAG = { flags: ["--filter"], metavar: "TERM", nargs: "+", default: null, help: "Filter listed items by one or more terms" };

export const _FORCE_FLAG = { flags: ["--force"], action: "store_true", default: false, help: "Force regeneration" };

export const _DEPLOY_FLAG = { flags: ["--deploy"], action: "store_true", default: false, help: "Deploy after generating" };

export const _COMMAND_TYPE_FLAG = { flags: ["--type"], metavar: "TYPE", default: null, choices: ["public", "private"], help: "Filter commands by type (public or private)" };

export const _GITHUB_SUBCOMMAND_ARG = { flags: ["subcommand"], metavar: "SUBCOMMAND", nargs: "*", default: [], help: "Action to perform: list, delete <owner/repo1> [owner/repo2 ...] | all (personal repos only)" };

export const _PROFILE_SUBCOMMAND_ARG = { flags: ["subcommand"], metavar: "SUBCOMMAND", nargs: "*", default: [], help: "Profile target: personal (default) | organization" };

export const _RESUMES_SUBCOMMAND_ARG = { flags: ["subcommand"], metavar: "SUBCOMMAND", nargs: "*", default: [], help: "Resume action: list (default) | show <resume-type> | generate <resume-type|all> [--force]" };

export const _JOBS_SUBCOMMAND_ARG = { flags: ["subcommand"], nargs: "?", default: "list", help: "Job search view: list (default), connections, certifications, algorithms, patterns, articles, projects" };

export const _JOBS_TODAY_FLAG = { flags: ["--today"], action: "store_true", default: false, help: "Show a copy-paste summary of job search items completed today (YYYYMMDD)" };

export const _SKILLS_SUBCOMMAND_ARG = { flags: ["subcommand"], nargs: "?", default: "list", help: "Skills action to perform: list, generate" };

export const _LEARNING_URL_ARG = { flags: ["url"], help: "LinkedIn Learning path URL to fetch courses from" };

export const _LEARNING_CATEGORY_FLAG = { flags: ["--category"], default: "Python", metavar: "CATEGORY", help: "Category label for the output lines (default: Python)" };

export const _BLOG_SUBCOMMAND_ARG = { flags: ["subcommand"], metavar: "SUBCOMMAND", nargs: "*", default: [], help: "Blog action to perform: list, generate, publish <id…>, unpublish <id…>, deploy [--publish], github [--force] [--deploy]" };

export const _DEFAULTS_SUBCOMMAND_ARG = { flags: ["subcommand"], nargs: "?", default: "list", help: "macOS defaults action to perform", choices: ["list", "generate"] };

export const _HOMEBREW_SUBCOMMAND_ARG = { flags: ["subcommand"], nargs: "?", default: "list", help: "Homebrew action to perform", choices: ["list", "generate"] };

export const _ZSH_SUBCOMMAND_ARG = { flags: ["subcommand"], metavar: "SUBCOMMAND", nargs: "?", default: "options", choices: ["options", "exports", "paths", "aliases", "plugins", "generate"], help: "Zsh config section to act on" };

export const _DUTI_SUBCOMMAND_ARG = { flags: ["subcommand"], nargs: "?", default: "list", help: "Duti action to perform", choices: ["list", "generate"] };

export const _DOWNLOAD_FORMAT_FLAG = { flags: ["--format"], choices: ["mp3", "mp4"], default: "mp4", help: "Output format: mp3 or mp4 (default: mp4)" };

export const _DOWNLOAD_URL_ARG = { flags: ["url"], nargs: "?", default: null, help: "URL to download" };

export const _DOWNLOAD_TITLE_FLAG = { flags: ["--title"], metavar: "TITLE", default: null, help: "Optional custom filename (without extension)" };

export const _PROJECTS_SUBCOMMAND_ARG = { flags: ["subcommand"], metavar: "SUBCOMMAND", nargs: "*", default: [], help: "Projects action to perform: list, generate" };

export const _VERCEL_SUBCOMMAND_ARG = { flags: ["subcommand"], metavar: "SUBCOMMAND", nargs: "*", default: [], help: "Vercel action to perform: list, delete <project1> [project2 …]" };

export const _MUSIC_SUBCOMMAND_ARG = { flags: ["subcommand"], metavar: "SUBCOMMAND", nargs: "*", default: [], help: "Music action to perform: list, download" };

export const _MUSIC_MISSING_FLAG = { flags: ["--missing"], action: "store_true", default: false, help: "Show only songs that have not been downloaded" };

export const _GOAL_COMPLETED_FLAG = { flags: ["--completed"], action: "store_true", default: false, help: "Show only completed goals" };

export const _GOAL_DUE_FLAG = { flags: ["--due"], action: "store_true", default: false, help: "Show only goals that due" };

export const _JOURNAL_SUBCOMMAND_ARG = { flags: ["subcommand"], metavar: "SUBCOMMAND", nargs: "?", default: "list", choices: ["list", "generate"], help: "Journal action to perform" };

export const _SSHS_SUBCOMMAND_ARG = { flags: ["subcommand"], metavar: "SUBCOMMAND", nargs: "?", default: "list", choices: ["list", "generate", "keys"], help: "SSH action: list (default), generate (write config file), keys (create missing key pairs)" };

export const _GIT_SUBCOMMAND_ARG = { flags: ["subcommand"], metavar: "SUBCOMMAND", nargs: "?", default: "list", choices: ["list", "ignore", "generate"], help: "Git config section to act on" };

export const _ENTERTAINMENT_SUBCOMMAND_ARG = { flags: ["subcommand"], metavar: "SUBCOMMAND", nargs: "*", default: [], choices: ["audiobooks", "comics", "comedy", "games", "movies", "television"], help: "Entertainment category to list: audiobooks, comedy, comics, games, movies, television" };

export const _DRAWINGS_SUBCOMMAND_ARG = { flags: ["subcommand"], metavar: "SUBCOMMAND", nargs: "*", default: [], help: "Drawings action to perform: list, rename <model_name>, generate [model_name]" };

export const _DRAWINGS_MISSING_FLAG = { flags: ["--missing"], action: "store_true", default: false, help: "Only show models with no images found" };

export const _BOOKMARKS_SUBCOMMAND_ARG = { flags: ["subcommand"], metavar: "FOLDER", nargs: "*", default: [], help: "Chrome bookmark folder to filter by (omit to use all folders)" };

export const _HOSTNAME_SUBCOMMAND_ARG = { flags: ["subcommand"], metavar: "SUBCOMMAND", nargs: "?", default: null, choices: ["generate", "update"], help: "Hostname action to perform (omit to show current hostname)" };

export const _HOSTNAME_VALUE_ARG = { flags: ["value"], metavar: "VALUE", nargs: "?", default: null, help: "New hostname to set (required for update subcommand)" };

export const _VSCODE_SUBCOMMAND_ARG = { flags: ["subcommand"], metavar: "SUBCOMMAND", nargs: "?", default: "list", choices: ["list", "keybindings", "extensions", "generate"], help: "VSCode config section to act on" };

export const _BUSINESS_SUBCOMMAND_ARG = { flags: ["subcommand"], metavar: "SUBCOMMAND", nargs: "?", default: "list", choices: ["list", "goals", "expenses", "income"], help: "Business info section to act on" };

export const _RESEARCH_SUBCOMMAND_ARG = { flags: ["subcommand"], metavar: "SUBCOMMAND", nargs: "*", default: [], help: "Research action to perform: list, generate" };

export const _RESOURCE_SUBCOMMAND_ARG = { flags: ["subcommand"], nargs: "?", default: "skills", help: "Scope: 'skills' (default) or 'research'" };

export const _RESOURCE_ACTION_ARG = { flags: ["action"], nargs: "?", default: "courses", help: "Resource type (articles, audiobooks, books, courses, magazines, podcasts, and videos)" };

export const _RESOURCE_DOWNLOAD_FLAG = { flags: ["--download"], action: "store_true", default: false, help: "Download missing items (articles, courses, and videos)" };

export const _RESOURCE_MISSING_FLAG = { flags: ["--missing"], action: "store_true", default: false, help: "Show only resources not yet downloaded" };

export const _RESOURCE_CATEGORY_FLAG = { flags: ["--category"], metavar: "CATEGORY", nargs: "+", default: null, help: "Only include items in these categories (exact match; supersedes --filter)" };

export const _KEYCHAIN_SUBCOMMAND_ARG = { flags: ["subcommand"], metavar: "SUBCOMMAND", nargs: "?", default: null, choices: ["list", "get", "set", "delete"], help: "Keychain action to perform" };

export const _VALUE_ARG = { flags: ["value"], nargs: "*", default: [], help: "Value to translate" };

export const _COUNT_FLAG = { flags: ["count"], nargs: "?", type: "int", default: 1, help: "Number of items to generate" };
export const _EXPORT_FLAG = { flags: ["--export"], action: "store_true", default: false, help: "Export results to a file" };

export const _PODCASTS_SUBCOMMAND_ARG = { flags: ["subcommand"], nargs: "?", default: "list", help: "Podcast episodes action to perform" };


// Camel-case aliases
export const FILTER_FLAG = _FILTER_FLAG;
export const FORCE_FLAG = _FORCE_FLAG;
export const DEPLOY_FLAG = _DEPLOY_FLAG;
export const EXPORT_FLAG = _EXPORT_FLAG;
export const VALUE_ARG = _VALUE_ARG;
export const COUNT_FLAG = _COUNT_FLAG;
export const COMMAND_TYPE_FLAG = _COMMAND_TYPE_FLAG;

// Additional camel-case aliases
export const RESOURCES_SUBCOMMAND_ARG = _RESOURCES_SUBCOMMAND_ARG;
export const RESOURCES_ACTION_ARG = _RESOURCES_ACTION_ARG;
export const RESOURCES_CATEGORY_FLAG = _RESOURCES_CATEGORY_FLAG;
export const ZIP_SUBCOMMAND_ARG = _ZIP_SUBCOMMAND_ARG;
export const RESOURCES_DOWNLOAD_FLAG = _RESOURCES_DOWNLOAD_FLAG;
export const RESOURCES_MISSING_FLAG = _RESOURCES_MISSING_FLAG;
export const GITHUB_SUBCOMMAND_ARG = _GITHUB_SUBCOMMAND_ARG;
export const PROFILE_SUBCOMMAND_ARG = _PROFILE_SUBCOMMAND_ARG;
export const RESUMES_SUBCOMMAND_ARG = _RESUMES_SUBCOMMAND_ARG;
export const JOBS_SUBCOMMAND_ARG = _JOBS_SUBCOMMAND_ARG;
export const JOBS_TODAY_FLAG = _JOBS_TODAY_FLAG;
export const SKILLS_SUBCOMMAND_ARG = _SKILLS_SUBCOMMAND_ARG;
export const LEARNING_URL_ARG = _LEARNING_URL_ARG;
export const LEARNING_CATEGORY_FLAG = _LEARNING_CATEGORY_FLAG;
export const BLOG_SUBCOMMAND_ARG = _BLOG_SUBCOMMAND_ARG;
export const DEFAULTS_SUBCOMMAND_ARG = _DEFAULTS_SUBCOMMAND_ARG;
export const HOMEBREW_SUBCOMMAND_ARG = _HOMEBREW_SUBCOMMAND_ARG;
export const ZSH_SUBCOMMAND_ARG = _ZSH_SUBCOMMAND_ARG;
export const DUTI_SUBCOMMAND_ARG = _DUTI_SUBCOMMAND_ARG;
export const DOWNLOAD_FORMAT_FLAG = _DOWNLOAD_FORMAT_FLAG;
export const DOWNLOAD_URL_ARG = _DOWNLOAD_URL_ARG;
export const DOWNLOAD_TITLE_FLAG = _DOWNLOAD_TITLE_FLAG;
export const PROJECTS_SUBCOMMAND_ARG = _PROJECTS_SUBCOMMAND_ARG;
export const VERCEL_SUBCOMMAND_ARG = _VERCEL_SUBCOMMAND_ARG;
export const MUSIC_SUBCOMMAND_ARG = _MUSIC_SUBCOMMAND_ARG;
export const MUSIC_MISSING_FLAG = _MUSIC_MISSING_FLAG;
export const GOAL_COMPLETED_FLAG = _GOAL_COMPLETED_FLAG;
export const GOAL_DUE_FLAG = _GOAL_DUE_FLAG;
export const JOURNAL_SUBCOMMAND_ARG = _JOURNAL_SUBCOMMAND_ARG;
export const SSHS_SUBCOMMAND_ARG = _SSHS_SUBCOMMAND_ARG;
export const GIT_SUBCOMMAND_ARG = _GIT_SUBCOMMAND_ARG;
export const ENTERTAINMENT_SUBCOMMAND_ARG = _ENTERTAINMENT_SUBCOMMAND_ARG;
export const DRAWINGS_SUBCOMMAND_ARG = _DRAWINGS_SUBCOMMAND_ARG;
export const DRAWINGS_MISSING_FLAG = _DRAWINGS_MISSING_FLAG;
export const BOOKMARKS_SUBCOMMAND_ARG = _BOOKMARKS_SUBCOMMAND_ARG;
export const HOSTNAME_SUBCOMMAND_ARG = _HOSTNAME_SUBCOMMAND_ARG;
export const HOSTNAME_VALUE_ARG = _HOSTNAME_VALUE_ARG;
export const VSCODE_SUBCOMMAND_ARG = _VSCODE_SUBCOMMAND_ARG;
export const BUSINESS_SUBCOMMAND_ARG = _BUSINESS_SUBCOMMAND_ARG;
export const RESEARCH_SUBCOMMAND_ARG = _RESEARCH_SUBCOMMAND_ARG;
export const RESOURCE_SUBCOMMAND_ARG = _RESOURCE_SUBCOMMAND_ARG;
export const RESOURCE_ACTION_ARG = _RESOURCE_ACTION_ARG;
export const RESOURCE_DOWNLOAD_FLAG = _RESOURCE_DOWNLOAD_FLAG;
export const RESOURCE_MISSING_FLAG = _RESOURCE_MISSING_FLAG;
export const RESOURCE_CATEGORY_FLAG = _RESOURCE_CATEGORY_FLAG;
export const KEYCHAIN_SUBCOMMAND_ARG = _KEYCHAIN_SUBCOMMAND_ARG;
export const PODCASTS_SUBCOMMAND_ARG = _PODCASTS_SUBCOMMAND_ARG;
