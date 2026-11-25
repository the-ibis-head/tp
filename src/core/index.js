/** Barrel of shared helpers. Prefer importing from here in command modules. */
export * from './args.js';
export * from './config.js';
export * from './data.js';
export * from './terminal.js';
export * from './subprocess.js';
export * from './utils.js';
export * from './http.js';
export * from './keychain.js';
export * from './gitops.js';
export * from './scaffold.js';
export * from './catalog.js';

// Snake_case aliases for shared helpers. Both spellings are accepted so
// command modules can use whichever fits their style.
export {
  filterTerms as _filter_terms,
  getField as _get_field,
  loadData as _load_data_file_with_cache,
  matchFilter as _match_filter,
  parseMeta as _parse_meta,
  recordType as _record_type,
  recordsOfType as _records_of_type,
} from './data.js';
export {
  displayError as _display_error,
  displayInfo as _display_info,
  displaySection as _display_section,
  displaySuccess as _display_success,
  displayWarn as _display_warn,
  displayTally as _display_tally,
  commandCombined as _command_combined_output,
  confirm as _confirm,
  visibleLen as _visible_len,
  withSpinner as _with_spinner,
  formatKvValue as format_kv_value,
  printKv as print_kv,
  generatedFileHeader as _generated_file_header,
  writeGeneratedLines as _write_generated_lines,
} from './terminal.js';
export { run as _run, commandExists as _command_exists, requireTool as _require_tool } from './subprocess.js';
export {
  singleSubcommand as _single_subcommand,
  TECH_NEXTJS as _TECH_NEXTJS,
  TECH_WORDPRESS as _TECH_WORDPRESS,
  WORDPRESS_BOILERPLATE_PROJECT_DIR as _WORDPRESS_BOILERPLATE_PROJECT_DIR,
} from './utils.js';
export {
  requireProjectsPath as _require_projects_path,
  requireDropboxPath as _require_dropbox_path,
  requireGistsPath as _require_gists_path,
  requireGistsPathForProjects as _require_gists_path_for_projects,
  trashPath as _trash_path,
  forceResetProject as _force_reset_project,
  scaffoldProject as _scaffold_project_command,
  copyGistFile as _copy_gist_file,
  copyGistFiles as _copy_gist_files,
  copyProjectFiles as _copy_project_files,
  copyProjectDirectories as _copy_project_directories,
  readmeFooterLine as _readme_footer_line,
  extractBoilerplateZip as _extract_boilerplate_zip,
  updatePackageJson as _update_package_json,
  renderTemplateFile as _render_template_file,
  updateNextjsLayoutMetadata as _update_nextjs_layout_metadata,
  copyProjectGists as _copy_project_gists,
  symlinkWordpressPlugin as _symlink_wordpress_plugin,
  deployToVercel as _deploy_to_vercel,
  generateSingleProject as _generate_single_project,
} from './scaffold.js';
export {
  requireDataDrive as _require_data_drive,
  collectNamedItems as _collect_named_items,
  generateDirectories as _generate_directories,
  handleNamedItems as _handle_named_items_command,
  filterNameCategory as _filter_name_category,
  resourceExistsOnDisk as _resource_exists_on_disk,
  countResourcesByItem as _count_resources_by_item,
  formatCountCell as _format_count_cell,
  listNamedItemsWithResources as _list_named_items_with_resources,
  categoryTerms as _category_terms,
  matchResource as _match_resource,
  RESOURCE_TYPES as _RESOURCE_TYPES,
  RESOURCE_TYPES_PLURAL as _RESOURCE_TYPES_PLURAL,
  RESOURCE_TYPE_MAP as _RESOURCE_TYPE_MAP,
} from './catalog.js';
export {
  fetchGithubRepos as _fetch_github_repos,
  confirmAndDelete as _confirm_and_delete,
  ghUserField as _gh_user_field,
  githubUsername as _github_username,
  githubRepoName as _github_repo_name,
  repoExists as _repo_exists,
  gitInitAndCommit as _git_init_and_commit,
  pushToGithub as _push_to_github,
  repoSlugFor as _repo_slug_for,
} from './gitops.js';
export {
  getKeychainSecret as _get_keychain_secret,
} from './keychain.js';
export {
  fetchHtml as _fetch_html,
  extractLinkedinCourses as _extract_linkedin_courses,
} from './http.js';

// Common flag aliases (snake_case names are also exported from args.js).
export { FILTER_FLAG as _FILTER_FLAG, FORCE_FLAG as _FORCE_FLAG } from './flags.js';
