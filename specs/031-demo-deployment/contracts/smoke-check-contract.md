# Public Smoke Check Contract

## Inputs

- canonical deployment URL returned by the deployment action
- expected release tag and revision
- bounded retry duration
- representative required asset paths

## Required checks

1. Entry document returns a successful response and HTML content.
2. Entry document references a generated module under the expected repository base.
3. Referenced generated module returns a successful response with script content.
4. Representative assets return successful, non-empty responses:
   - title/scene background
   - entrant or vehicle image
   - item-family image
   - one regional background
5. Public build output contains the expected release identity.

## Failure output

Every failure reports:

- failed URL or identity assertion
- last response status or network error
- attempts performed
- whether failure occurred before or after deployment
- manual recovery instruction pointing to previous-tag redeployment

The checker returns a failing exit status but performs no deployment mutation.
