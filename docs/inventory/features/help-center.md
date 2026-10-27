# Help center

**Area:** Knowledge

Help center portals, categories and articles, the public portal pages, custom domains and article search.

**Feature flags:** `help_center`

## HTTP routes (48)

| Verb | Path | Controller#action |
| --- | --- | --- |
| GET | `/api/v1/accounts/:account_id/onboarding/help_center_generation(.:format)` | `api/v1/accounts/onboardings#help_center_generation` |
| GET | `/api/v1/accounts/:account_id/search/articles(.:format)` | `api/v1/accounts/search#articles` |
| PATCH | `/api/v1/accounts/:account_id/portals/:id/archive(.:format)` | `api/v1/accounts/portals#archive` |
| DELETE | `/api/v1/accounts/:account_id/portals/:id/logo(.:format)` | `api/v1/accounts/portals#logo` |
| POST | `/api/v1/accounts/:account_id/portals/:id/send_instructions(.:format)` | `api/v1/accounts/portals#send_instructions` |
| GET | `/api/v1/accounts/:account_id/portals/:id/ssl_status(.:format)` | `api/v1/accounts/portals#ssl_status` |
| POST | `/api/v1/accounts/:account_id/portals/:portal_id/categories/reorder(.:format)` | `api/v1/accounts/categories#reorder` |
| GET | `/api/v1/accounts/:account_id/portals/:portal_id/categories(.:format)` | `api/v1/accounts/categories#index` |
| POST | `/api/v1/accounts/:account_id/portals/:portal_id/categories(.:format)` | `api/v1/accounts/categories#create` |
| GET | `/api/v1/accounts/:account_id/portals/:portal_id/categories/new(.:format)` | `api/v1/accounts/categories#new` |
| GET | `/api/v1/accounts/:account_id/portals/:portal_id/categories/:id/edit(.:format)` | `api/v1/accounts/categories#edit` |
| GET | `/api/v1/accounts/:account_id/portals/:portal_id/categories/:id(.:format)` | `api/v1/accounts/categories#show` |
| PATCH | `/api/v1/accounts/:account_id/portals/:portal_id/categories/:id(.:format)` | `api/v1/accounts/categories#update` |
| PUT | `/api/v1/accounts/:account_id/portals/:portal_id/categories/:id(.:format)` | `api/v1/accounts/categories#update` |
| DELETE | `/api/v1/accounts/:account_id/portals/:portal_id/categories/:id(.:format)` | `api/v1/accounts/categories#destroy` |
| POST | `/api/v1/accounts/:account_id/portals/:portal_id/articles/bulk_actions/translate(.:format)` | `api/v1/accounts/articles/bulk_actions#translate` |
| PATCH | `/api/v1/accounts/:account_id/portals/:portal_id/articles/bulk_actions/update_status(.:format)` | `api/v1/accounts/articles/bulk_actions#update_status` |
| PATCH | `/api/v1/accounts/:account_id/portals/:portal_id/articles/bulk_actions/update_category(.:format)` | `api/v1/accounts/articles/bulk_actions#update_category` |
| DELETE | `/api/v1/accounts/:account_id/portals/:portal_id/articles/bulk_actions/delete_articles(.:format)` | `api/v1/accounts/articles/bulk_actions#delete_articles` |
| POST | `/api/v1/accounts/:account_id/portals/:portal_id/articles/reorder(.:format)` | `api/v1/accounts/articles#reorder` |
| GET | `/api/v1/accounts/:account_id/portals/:portal_id/articles(.:format)` | `api/v1/accounts/articles#index` |
| POST | `/api/v1/accounts/:account_id/portals/:portal_id/articles(.:format)` | `api/v1/accounts/articles#create` |
| GET | `/api/v1/accounts/:account_id/portals/:portal_id/articles/new(.:format)` | `api/v1/accounts/articles#new` |
| GET | `/api/v1/accounts/:account_id/portals/:portal_id/articles/:id/edit(.:format)` | `api/v1/accounts/articles#edit` |
| GET | `/api/v1/accounts/:account_id/portals/:portal_id/articles/:id(.:format)` | `api/v1/accounts/articles#show` |
| PATCH | `/api/v1/accounts/:account_id/portals/:portal_id/articles/:id(.:format)` | `api/v1/accounts/articles#update` |
| PUT | `/api/v1/accounts/:account_id/portals/:portal_id/articles/:id(.:format)` | `api/v1/accounts/articles#update` |
| DELETE | `/api/v1/accounts/:account_id/portals/:portal_id/articles/:id(.:format)` | `api/v1/accounts/articles#destroy` |
| GET | `/api/v1/accounts/:account_id/portals(.:format)` | `api/v1/accounts/portals#index` |
| POST | `/api/v1/accounts/:account_id/portals(.:format)` | `api/v1/accounts/portals#create` |
| GET | `/api/v1/accounts/:account_id/portals/new(.:format)` | `api/v1/accounts/portals#new` |
| GET | `/api/v1/accounts/:account_id/portals/:id/edit(.:format)` | `api/v1/accounts/portals#edit` |
| GET | `/api/v1/accounts/:account_id/portals/:id(.:format)` | `api/v1/accounts/portals#show` |
| PATCH | `/api/v1/accounts/:account_id/portals/:id(.:format)` | `api/v1/accounts/portals#update` |
| PUT | `/api/v1/accounts/:account_id/portals/:id(.:format)` | `api/v1/accounts/portals#update` |
| DELETE | `/api/v1/accounts/:account_id/portals/:id(.:format)` | `api/v1/accounts/portals#destroy` |
| GET | `/hc/:slug(.:format)` | `public/api/v1/portals#show` |
| GET | `/hc/:slug/sitemap.xml(.:format)` | `public/api/v1/portals#sitemap` |
| GET | `/hc/:slug/:locale(.:format)` | `public/api/v1/portals#show` |
| GET | `/hc/:slug/:locale/search(.:format)` | `public/api/v1/portals/search#index` |
| GET | `/hc/:slug/:locale/articles(.:format)` | `public/api/v1/portals/articles#index` |
| GET | `/hc/:slug/:locale/categories(.:format)` | `public/api/v1/portals/categories#index` |
| GET | `/hc/:slug/:locale/categories/:category_slug(.:format)` | `public/api/v1/portals/categories#show` |
| GET | `/hc/:slug/:locale/categories/:category_slug/articles(.:format)` | `public/api/v1/portals/articles#index` |
| GET | `/hc/:slug/articles/:article_slug.png(.:format)` | `public/api/v1/portals/articles#tracking_pixel` |
| GET | `/hc/:slug/articles/:article_slug.md(.:format)` | `public/api/v1/portals/articles#show_markdown` |
| GET | `/hc/:slug/articles/:article_slug(.:format)` | `public/api/v1/portals/articles#show` |
| GET | `/.well-known/cf-custom-hostname-challenge/:id(.:format)` | `custom_domains#verify` |

## Database tables (6)

`articles`, `categories`, `folders`, `portals`, `portals_members`, `related_categories`

## Backend files (148)

### controllers (15)

- `app/controllers/api/v1/accounts/articles/bulk_actions_controller.rb`
- `app/controllers/api/v1/accounts/articles_controller.rb`
- `app/controllers/api/v1/accounts/categories_controller.rb`
- `app/controllers/api/v1/accounts/portals_controller.rb`
- `app/controllers/concerns/portal_home_data.rb`
- `app/controllers/public/api/v1/portals/articles_controller.rb`
- `app/controllers/public/api/v1/portals/base_controller.rb`
- `app/controllers/public/api/v1/portals/categories_controller.rb`
- `app/controllers/public/api/v1/portals/search_controller.rb`
- `app/controllers/public/api/v1/portals_controller.rb`
- `enterprise/app/controllers/custom_domains_controller.rb` (EE)
- `enterprise/app/controllers/enterprise/api/v1/accounts/articles/bulk_actions_controller.rb` (EE)
- `enterprise/app/controllers/enterprise/api/v1/accounts/portals_controller.rb` (EE)
- `enterprise/app/controllers/enterprise/public/api/v1/portals/articles_controller.rb` (EE)
- `enterprise/app/controllers/enterprise/public/api/v1/portals/search_controller.rb` (EE)

### helpers (1)

- `app/helpers/portal_helper.rb`

### jobs (4)

- `enterprise/app/jobs/enterprise/cloudflare_verification_job.rb` (EE)
- `enterprise/app/jobs/onboarding/help_center_article_generation_job.rb` (EE)
- `enterprise/app/jobs/onboarding/help_center_article_writer_job.rb` (EE)
- `enterprise/app/jobs/portal/article_indexing_job.rb` (EE)

### lib (1)

- `lib/integrations/cloudflare/realtime_kit_credentials_validator.rb`

### mailers (1)

- `app/mailers/portal_instructions_mailer.rb`

### models (9)

- `app/models/article.rb`
- `app/models/category.rb`
- `app/models/concerns/portal_config_schema.rb`
- `app/models/folder.rb`
- `app/models/kbase.rb`
- `app/models/portal.rb`
- `app/models/related_category.rb`
- `enterprise/app/models/enterprise/concerns/article.rb` (EE)
- `enterprise/app/models/enterprise/concerns/portal.rb` (EE)

### policies (6)

- `app/policies/article_policy.rb`
- `app/policies/category_policy.rb`
- `app/policies/portal_policy.rb`
- `enterprise/app/policies/enterprise/article_policy.rb` (EE)
- `enterprise/app/policies/enterprise/category_policy.rb` (EE)
- `enterprise/app/policies/enterprise/portal_policy.rb` (EE)

### services (8)

- `enterprise/app/services/cloudflare/base_cloudflare_zone_service.rb` (EE)
- `enterprise/app/services/cloudflare/check_custom_hostname_service.rb` (EE)
- `enterprise/app/services/cloudflare/create_custom_hostname_service.rb` (EE)
- `enterprise/app/services/onboarding/help_center_article_builder.rb` (EE)
- `enterprise/app/services/onboarding/help_center_creation_service.rb` (EE)
- `enterprise/app/services/onboarding/help_center_curator.rb` (EE)
- `enterprise/app/services/onboarding/help_center_errors.rb` (EE)
- `enterprise/app/services/onboarding/help_center_generation_state.rb` (EE)

### views (103)

- `app/views/api/v1/accounts/articles/_article.json.jbuilder`
- `app/views/api/v1/accounts/articles/_associated_article.json.jbuilder`
- `app/views/api/v1/accounts/articles/create.json.jbuilder`
- `app/views/api/v1/accounts/articles/edit.json.jbuilder`
- `app/views/api/v1/accounts/articles/index.json.jbuilder`
- `app/views/api/v1/accounts/articles/show.json.jbuilder`
- `app/views/api/v1/accounts/articles/update.json.jbuilder`
- `app/views/api/v1/accounts/categories/_associated_category.json.jbuilder`
- `app/views/api/v1/accounts/categories/_category.json.jbuilder`
- `app/views/api/v1/accounts/categories/create.json.jbuilder`
- `app/views/api/v1/accounts/categories/index.json.jbuilder`
- `app/views/api/v1/accounts/categories/show.json.jbuilder`
- `app/views/api/v1/accounts/categories/update.json.jbuilder`
- `app/views/api/v1/accounts/portals/_portal.json.jbuilder`
- `app/views/api/v1/accounts/portals/add_members.json.jbuilder`
- `app/views/api/v1/accounts/portals/create.json.jbuilder`
- `app/views/api/v1/accounts/portals/index.json.jbuilder`
- `app/views/api/v1/accounts/portals/show.json.jbuilder`
- `app/views/api/v1/accounts/portals/update.json.jbuilder`
- `app/views/api/v1/accounts/search/_article.json.jbuilder`
- `app/views/api/v1/accounts/search/articles.json.jbuilder`
- `app/views/api/v1/models/_portal_config.json.jbuilder`
- `app/views/layouts/_portal_analytics.html.erb`
- `app/views/layouts/_portal_analytics_noscript.html.erb`
- `app/views/layouts/_portal_head.html.erb`
- `app/views/layouts/_portal_scripts.html.erb`
- `app/views/layouts/portal.html+documentation.erb`
- `app/views/layouts/portal.html+plain.erb`
- `app/views/layouts/portal.html.erb`
- `app/views/mailers/portal_instructions_mailer/send_cname_instructions.liquid`
- `app/views/public/api/v1/models/_article.json.jbuilder`
- `app/views/public/api/v1/models/_associated_category.json.jbuilder`
- `app/views/public/api/v1/models/_category.json.jbuilder`
- `app/views/public/api/v1/models/_search_article.json.jbuilder`
- `app/views/public/api/v1/models/hc/_associated_article.json.jbuilder`
- `app/views/public/api/v1/models/hc/_author.json.jbuilder`
- `app/views/public/api/v1/models/hc/_portal.json.jbuilder`
- `app/views/public/api/v1/portals/_article_count.html.erb`
- `app/views/public/api/v1/portals/_authors.html.erb`
- `app/views/public/api/v1/portals/_category-block.html+plain.erb`
- `app/views/public/api/v1/portals/_category-block.html.erb`
- `app/views/public/api/v1/portals/_featured_articles.html.erb`
- `app/views/public/api/v1/portals/_footer.html.erb`
- `app/views/public/api/v1/portals/_header.html.erb`
- `app/views/public/api/v1/portals/_hero.html.erb`
- `app/views/public/api/v1/portals/_home_categories.html.erb`
- `app/views/public/api/v1/portals/_mobile_menu.html.erb`
- `app/views/public/api/v1/portals/_thumbnail.html.erb`
- `app/views/public/api/v1/portals/_uncategorized-block.html+plain.erb`
- `app/views/public/api/v1/portals/_uncategorized-block.html.erb`
- `app/views/public/api/v1/portals/articles/_article_body.html.erb`
- `app/views/public/api/v1/portals/articles/_article_header.html.erb`
- `app/views/public/api/v1/portals/articles/_content.html.erb`
- `app/views/public/api/v1/portals/articles/_meta_head.html.erb`
- `app/views/public/api/v1/portals/articles/index.html.erb`
- `app/views/public/api/v1/portals/articles/index.json.jbuilder`
- `app/views/public/api/v1/portals/articles/show.html+documentation.erb`
- `app/views/public/api/v1/portals/articles/show.html+plain.erb`
- `app/views/public/api/v1/portals/articles/show.html.erb`
- `app/views/public/api/v1/portals/articles/show.json.jbuilder`
- `app/views/public/api/v1/portals/categories/_article_list.html+plain.erb`
- `app/views/public/api/v1/portals/categories/_article_list.html.erb`
- `app/views/public/api/v1/portals/categories/_category-block.html.erb`
- `app/views/public/api/v1/portals/categories/_category-hero.html.erb`
- `app/views/public/api/v1/portals/categories/_hero.html.erb`
- `app/views/public/api/v1/portals/categories/_meta_head.html.erb`
- `app/views/public/api/v1/portals/categories/index.html.erb`
- `app/views/public/api/v1/portals/categories/index.json.jbuilder`
- `app/views/public/api/v1/portals/categories/show.html+documentation.erb`
- `app/views/public/api/v1/portals/categories/show.html+plain.erb`
- `app/views/public/api/v1/portals/categories/show.html.erb`
- `app/views/public/api/v1/portals/categories/show.json.jbuilder`
- `app/views/public/api/v1/portals/documentation_layout/_article_card.html.erb`
- `app/views/public/api/v1/portals/documentation_layout/_avatar_group.html.erb`
- `app/views/public/api/v1/portals/documentation_layout/_breadcrumb.html.erb`
- `app/views/public/api/v1/portals/documentation_layout/_category_card.html.erb`
- `app/views/public/api/v1/portals/documentation_layout/_empty_state.html.erb`
- `app/views/public/api/v1/portals/documentation_layout/_footer.html.erb`
- `app/views/public/api/v1/portals/documentation_layout/_hero.html.erb`
- `app/views/public/api/v1/portals/documentation_layout/_section_header.html.erb`
- `app/views/public/api/v1/portals/documentation_layout/_sidebar.html.erb`
- `app/views/public/api/v1/portals/documentation_layout/_topbar.html.erb`
- `app/views/public/api/v1/portals/documentation_layout/_user_avatar.html.erb`
- `app/views/public/api/v1/portals/documentation_layout/articles/_actions.html.erb`
- `app/views/public/api/v1/portals/documentation_layout/articles/_header.html.erb`
- `app/views/public/api/v1/portals/documentation_layout/articles/_meta_head.html.erb`
- `app/views/public/api/v1/portals/documentation_layout/categories/_header.html.erb`
- `app/views/public/api/v1/portals/documentation_layout/categories/_meta_head.html.erb`
- `app/views/public/api/v1/portals/error/404.html.erb`
- `app/views/public/api/v1/portals/index.json.jbuilder`
- `app/views/public/api/v1/portals/not_active.html.erb`
- `app/views/public/api/v1/portals/search/_form.html.erb`
- `app/views/public/api/v1/portals/search/_results.html.erb`
- `app/views/public/api/v1/portals/search/_results_header.html.erb`
- `app/views/public/api/v1/portals/search/_search_handler.html.erb`
- `app/views/public/api/v1/portals/search/index.html+documentation.erb`
- `app/views/public/api/v1/portals/search/index.html+plain.erb`
- `app/views/public/api/v1/portals/search/index.html.erb`
- `app/views/public/api/v1/portals/show.html+documentation.erb`
- `app/views/public/api/v1/portals/show.html+plain.erb`
- `app/views/public/api/v1/portals/show.html.erb`
- `app/views/public/api/v1/portals/show.json.jbuilder`
- `app/views/public/api/v1/portals/sitemap.xml.erb`

## Ruby specs (38)

- `spec/controllers/api/v1/accounts/articles/bulk_actions_controller_spec.rb`
- `spec/controllers/api/v1/accounts/articles_controller_spec.rb`
- `spec/controllers/api/v1/accounts/categories_controller_spec.rb`
- `spec/controllers/api/v1/accounts/portals_controller_spec.rb`
- `spec/controllers/dashboard_custom_domain_spec.rb`
- `spec/controllers/public/api/v1/portals/articles_controller_spec.rb`
- `spec/controllers/public/api/v1/portals/categories_controller_spec.rb`
- `spec/controllers/public/api/v1/portals_controller_spec.rb`
- `spec/enterprise/controllers/enterprise/api/v1/accounts/articles/bulk_actions_controller_spec.rb`
- `spec/enterprise/controllers/enterprise/api/v1/accounts/articles_controller_spec.rb`
- `spec/enterprise/controllers/enterprise/api/v1/accounts/categories_controller_spec.rb`
- `spec/enterprise/controllers/enterprise/api/v1/accounts/portals_controller_spec.rb`
- `spec/enterprise/controllers/enterprise/public/api/v1/helpcenter_plan_access_spec.rb`
- `spec/enterprise/controllers/enterprise/public/api/v1/portals/articles_controller_spec.rb`
- `spec/enterprise/jobs/enterprise/cloudflare_verification_job_spec.rb`
- `spec/enterprise/jobs/onboarding/help_center_article_generation_job_spec.rb`
- `spec/enterprise/jobs/onboarding/help_center_article_writer_job_spec.rb`
- `spec/enterprise/models/enterprise/concerns/portal_spec.rb`
- `spec/enterprise/policies/article_policy_spec.rb`
- `spec/enterprise/policies/category_policy_spec.rb`
- `spec/enterprise/policies/portal_policy_spec.rb`
- `spec/enterprise/services/cloudflare/check_custom_hostname_service_spec.rb`
- `spec/enterprise/services/cloudflare/create_custom_hostname_service_spec.rb`
- `spec/enterprise/services/onboarding/help_center_article_builder_spec.rb`
- `spec/enterprise/services/onboarding/help_center_creation_service_spec.rb`
- `spec/enterprise/services/onboarding/help_center_curator_spec.rb`
- `spec/enterprise/services/onboarding/help_center_generation_state_spec.rb`
- `spec/helpers/portal_helper_spec.rb`
- `spec/lib/integrations/cloudflare/realtime_kit_credentials_validator_spec.rb`
- `spec/mailers/portal_instructions_mailer_spec.rb`
- `spec/models/article_spec.rb`
- `spec/models/category_spec.rb`
- `spec/models/folder_spec.rb`
- `spec/models/portal_spec.rb`
- `spec/models/related_category_spec.rb`
- `spec/policies/article_policy_spec.rb`
- `spec/policies/category_policy_spec.rb`
- `spec/policies/portal_policy_spec.rb`

## Frontend files (127)

- `app/javascript/dashboard/api/helpCenter/articles.js`
- `app/javascript/dashboard/api/helpCenter/categories.js`
- `app/javascript/dashboard/api/helpCenter/portals.js`
- `app/javascript/dashboard/api/specs/article.spec.js`
- `app/javascript/dashboard/api/specs/helpCenter/categories.spec.js`
- `app/javascript/dashboard/api/specs/portals.spec.js`
- `app/javascript/dashboard/components-next/HelpCenter/ArticleCard/ArticleCard.story.vue`
- `app/javascript/dashboard/components-next/HelpCenter/ArticleCard/ArticleCard.vue`
- `app/javascript/dashboard/components-next/HelpCenter/CategoryCard/CategoryCard.story.vue`
- `app/javascript/dashboard/components-next/HelpCenter/CategoryCard/CategoryCard.vue`
- `app/javascript/dashboard/components-next/HelpCenter/EmptyState/Article/ArticleEmptyState.story.vue`
- `app/javascript/dashboard/components-next/HelpCenter/EmptyState/Article/ArticleEmptyState.vue`
- `app/javascript/dashboard/components-next/HelpCenter/EmptyState/Category/CategoryEmptyState.vue`
- `app/javascript/dashboard/components-next/HelpCenter/EmptyState/Category/categoryEmptyStateContent.js`
- `app/javascript/dashboard/components-next/HelpCenter/EmptyState/Portal/PortalEmptyState.story.vue`
- `app/javascript/dashboard/components-next/HelpCenter/EmptyState/Portal/PortalEmptyState.vue`
- `app/javascript/dashboard/components-next/HelpCenter/EmptyState/Portal/portalEmptyStateContent.js`
- `app/javascript/dashboard/components-next/HelpCenter/HelpCenterLayout.vue`
- `app/javascript/dashboard/components-next/HelpCenter/LocaleCard/LocaleCard.story.vue`
- `app/javascript/dashboard/components-next/HelpCenter/LocaleCard/LocaleCard.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/ArticleEditorPage/ArticleDiffPanel.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/ArticleEditorPage/ArticleEditor.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/ArticleEditorPage/ArticleEditorControls.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/ArticleEditorPage/ArticleEditorHeader.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/ArticleEditorPage/ArticleEditorProperties.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/ArticleEditorPage/ArticlePendingChangesPopover.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/ArticleEditorPage/ArticleSlugField.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/ArticlePage/ArticleHeaderControls.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/ArticlePage/ArticleList.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/ArticlePage/ArticlesPage.story.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/ArticlePage/ArticlesPage.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/ArticlePage/BulkTranslateDialog.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/CategoryPage/CategoriesPage.story.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/CategoryPage/CategoriesPage.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/CategoryPage/CategoryDialog.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/CategoryPage/CategoryForm.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/CategoryPage/CategoryHeaderControls.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/CategoryPage/CategoryList.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/CategoryPage/EditCategoryDialog.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/LocalePage/AddLocaleDialog.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/LocalePage/LocaleContentDialog.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/LocalePage/LocaleList.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/LocalePage/LocalesPage.story.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/LocalePage/LocalesPage.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/LocalePage/PopularContentDialog.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/PortalSettingsPage/AddCustomDomainDialog.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/PortalSettingsPage/ConfirmDeletePortalDialog.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/PortalSettingsPage/DNSConfigurationDialog.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/PortalSettingsPage/PortalBaseSettings.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/PortalSettingsPage/PortalConfigurationSettings.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/PortalSettingsPage/PortalGeneralSettings.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/PortalSettingsPage/PortalIntegrationsSettings.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/PortalSettingsPage/PortalLayoutContentSettings.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/PortalSettingsPage/PortalSettings.story.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/PortalSettingsPage/PortalSettings.vue`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/PortalSettingsPage/classic-layout-preview.svg`
- `app/javascript/dashboard/components-next/HelpCenter/Pages/PortalSettingsPage/documentation-layout-preview.svg`
- `app/javascript/dashboard/components-next/HelpCenter/PortalSwitcher/CreatePortalDialog.vue`
- `app/javascript/dashboard/components-next/HelpCenter/PortalSwitcher/PortalSwitcher.story.vue`
- `app/javascript/dashboard/components-next/HelpCenter/PortalSwitcher/PortalSwitcher.vue`
- `app/javascript/dashboard/helper/articleDiffHelper.js`
- `app/javascript/dashboard/helper/portalHelper.js`
- `app/javascript/dashboard/helper/specs/articleDiffHelper.spec.js`
- `app/javascript/dashboard/helper/specs/portalHelper.spec.js`
- `app/javascript/dashboard/modules/search/components/SearchResultArticleItem.vue`
- `app/javascript/dashboard/modules/search/components/SearchResultArticlesList.vue`
- `app/javascript/dashboard/routes/dashboard/helpcenter/components/ArticleSearch/ArticleSearchResultItem.vue`
- `app/javascript/dashboard/routes/dashboard/helpcenter/components/ArticleSearch/ArticleView.vue`
- `app/javascript/dashboard/routes/dashboard/helpcenter/components/ArticleSearch/Header.vue`
- `app/javascript/dashboard/routes/dashboard/helpcenter/components/ArticleSearch/SearchPopover.vue`
- `app/javascript/dashboard/routes/dashboard/helpcenter/components/ArticleSearch/SearchResults.vue`
- `app/javascript/dashboard/routes/dashboard/helpcenter/components/UpgradePage.vue`
- `app/javascript/dashboard/routes/dashboard/helpcenter/helpcenter.routes.js`
- `app/javascript/dashboard/routes/dashboard/helpcenter/helpers/routeHelper.js`
- `app/javascript/dashboard/routes/dashboard/helpcenter/helpers/specs/routeHelper.spec.js`
- `app/javascript/dashboard/routes/dashboard/helpcenter/pages/HelpCenterPageRouteView.vue`
- `app/javascript/dashboard/routes/dashboard/helpcenter/pages/PortalsArticlesEditPage.vue`
- `app/javascript/dashboard/routes/dashboard/helpcenter/pages/PortalsArticlesIndexPage.vue`
- `app/javascript/dashboard/routes/dashboard/helpcenter/pages/PortalsArticlesNewPage.vue`
- `app/javascript/dashboard/routes/dashboard/helpcenter/pages/PortalsCategoriesIndexPage.vue`
- `app/javascript/dashboard/routes/dashboard/helpcenter/pages/PortalsIndexPage.vue`
- `app/javascript/dashboard/routes/dashboard/helpcenter/pages/PortalsLocalesIndexPage.vue`
- `app/javascript/dashboard/routes/dashboard/helpcenter/pages/PortalsNewPage.vue`
- `app/javascript/dashboard/routes/dashboard/helpcenter/pages/PortalsSettingsIndexPage.vue`
- `app/javascript/dashboard/routes/dashboard/onboarding/inbox-setup/HelpCenterCreationStatus.vue`
- `app/javascript/dashboard/routes/dashboard/onboarding/specs/inbox-setup/HelpCenterCreationStatus.spec.js`
- `app/javascript/dashboard/store/modules/helpCenterArticles/actions.js`
- `app/javascript/dashboard/store/modules/helpCenterArticles/getters.js`
- `app/javascript/dashboard/store/modules/helpCenterArticles/index.js`
- `app/javascript/dashboard/store/modules/helpCenterArticles/mutations.js`
- `app/javascript/dashboard/store/modules/helpCenterArticles/specs/action.spec.js`
- `app/javascript/dashboard/store/modules/helpCenterArticles/specs/fixtures.js`
- `app/javascript/dashboard/store/modules/helpCenterArticles/specs/getters.spec.js`
- `app/javascript/dashboard/store/modules/helpCenterArticles/specs/mutation.spec.js`
- `app/javascript/dashboard/store/modules/helpCenterCategories/actions.js`
- `app/javascript/dashboard/store/modules/helpCenterCategories/getters.js`
- `app/javascript/dashboard/store/modules/helpCenterCategories/index.js`
- `app/javascript/dashboard/store/modules/helpCenterCategories/mutations.js`
- `app/javascript/dashboard/store/modules/helpCenterCategories/specs/actions.spec.js`
- `app/javascript/dashboard/store/modules/helpCenterCategories/specs/fixtures.js`
- `app/javascript/dashboard/store/modules/helpCenterCategories/specs/getters.spec.js`
- `app/javascript/dashboard/store/modules/helpCenterCategories/specs/mutations.spec.js`
- `app/javascript/dashboard/store/modules/helpCenterPortals/actions.js`
- `app/javascript/dashboard/store/modules/helpCenterPortals/getters.js`
- `app/javascript/dashboard/store/modules/helpCenterPortals/index.js`
- `app/javascript/dashboard/store/modules/helpCenterPortals/mutations.js`
- `app/javascript/dashboard/store/modules/helpCenterPortals/specs/actions.spec.js`
- `app/javascript/dashboard/store/modules/helpCenterPortals/specs/fixtures.js`
- `app/javascript/dashboard/store/modules/helpCenterPortals/specs/getters.spec.js`
- `app/javascript/dashboard/store/modules/helpCenterPortals/specs/mutations.spec.js`
- `app/javascript/entrypoints/portal.js`
- `app/javascript/portal/api/article.js`
- `app/javascript/portal/application.scss`
- `app/javascript/portal/components/PublicArticleSearch.vue`
- `app/javascript/portal/components/PublicSearchInput.vue`
- `app/javascript/portal/components/SearchSuggestions.vue`
- `app/javascript/portal/components/SidebarThemeToggle.vue`
- `app/javascript/portal/components/TableOfContents.vue`
- `app/javascript/portal/portalHelpers.js`
- `app/javascript/portal/portalThemeHelper.js`
- `app/javascript/portal/specs/PublicArticleSearch.spec.js`
- `app/javascript/portal/specs/SearchSuggestions.spec.js`
- `app/javascript/portal/specs/portal.spec.js`
- `app/javascript/portal/specs/portalTheme.spec.js`
- `app/javascript/shared/components/ArticleSkeletonLoader.vue`
- `app/javascript/shared/helpers/portalHelper.js`
- `app/javascript/shared/helpers/specs/portalHelper.spec.js`
