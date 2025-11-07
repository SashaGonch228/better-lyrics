import type { Config } from "stylelint";
import blyricsVariableAllowlist from "@/options/editor/blyrics-variable-allowlist";

export const SAVE_DEBOUNCE_DELAY = 1000;
export const SAVE_CUSTOM_THEME_DEBOUNCE = 2000;
export const SYNC_STORAGE_LIMIT = 7000;
export const MAX_RETRY_ATTEMPTS = 3;
export const BRACKET_NESTING_LEVELS = 7;

export const stylelintConfig: Config = {
  rules: {
    "annotation-no-unknown": true,
    "at-rule-no-unknown": true,
    "block-no-empty": true,
    "comment-no-empty": true,
    "custom-property-no-missing-var-function": true,
    "declaration-block-no-duplicate-custom-properties": true,
    "declaration-block-no-duplicate-properties": [
      true,
      {
        ignore: ["consecutive-duplicates-with-different-syntaxes"],
      },
    ],
    "declaration-block-no-shorthand-property-overrides": true,
    "declaration-property-value-no-unknown": true,
    "font-family-no-duplicate-names": true,
    "font-family-no-missing-generic-family-keyword": true,
    "function-calc-no-unspaced-operator": true,
    "keyframe-block-no-duplicate-selectors": true,
    "keyframe-declaration-no-important": true,
    "media-feature-name-no-unknown": true,
    "media-feature-name-value-no-unknown": true,
    "media-query-no-invalid": true,
    "named-grid-areas-no-invalid": true,
    "no-descending-specificity": true,
    "no-duplicate-at-import-rules": true,
    "no-duplicate-selectors": true,
    "no-empty-source": true,
    "no-invalid-double-slash-comments": true,
    "no-invalid-position-at-import-rule": true,
    "no-irregular-whitespace": true,
    "property-no-unknown": true,
    "selector-anb-no-unmatchable": true,
    "selector-pseudo-class-no-unknown": true,
    "selector-pseudo-element-no-unknown": true,
    "selector-type-no-unknown": [
      true,
      {
        ignore: ["custom-elements"],
      },
    ],
    "string-no-newline": [true, { ignore: ["at-rule-preludes", "declaration-values"] }],
  },
};
