# API Specifications

This directory contains the canonical API specifications for the shumilog project.

## Structure

- `v1/` - Version 1 API specifications
  - `openapi.yaml` - OpenAPI 3.0 specification for the Hobby Content Log API

## Maintenance

This API specification is the **source of truth** for all API development and should be continuously maintained as features are developed. When making changes to the API:

1. Update the specification first
2. Update contract tests to match the specification
3. Implement the API changes
4. Verify that implementation matches the specification

## Usage

- Backend contract tests reference this specification
- Frontend API clients should be generated from this specification
- Documentation is generated from this specification