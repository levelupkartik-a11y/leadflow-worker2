# LeadFlow Worker Rules & Guidelines

To ensure the worker does not make layout, selector, or copy generation mistakes, follow these strict rules at all times:

## 1. Testimonial & Card Selector Safety
- **Never** use generic element selectors like `$(el).find('span')` or `$(el).find('p')` inside repeating component cards (like testimonials, services, or team members).
- Star icons are often represented as `<span>` tags (e.g. Material Symbols). Overwriting all `<span>` tags replaces the star icons with plain text (which clips to `CLI`).
- **Always** target specific classes (like `.testimonial-quote`, `.testimonial-author`) or use precise relational selectors (like `$(el).find('h4').siblings('span')`) to isolate styling from data.

## 2. Template Nesting & Tag Closure Checks
- When adapting layouts, verify that all section tags in the base HTML templates are properly opened and closed (e.g. `</section>`).
- A missing closing section tag causes subsequent sections to nest within it. This breaks layout selectors (like `.grid > div`) by targeting columns in sibling sections (like map/hours grid columns) as if they were repeating card components.

## 3. Fallback Content for API Fluctuation
- API results (like Google Maps search) can fluctuate between returning full details and minimal lists.
- **Never** drop page sections (like testimonials or FAQs) entirely just because an API list returned empty.
- **Always** generate high-quality, anonymous, context-aware fallback data (e.g., fallback reviews matching the business category) when the research API data is missing.
