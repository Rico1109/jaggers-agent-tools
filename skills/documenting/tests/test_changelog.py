#!/usr/bin/env python3
"""Tests for CHANGELOG management scripts."""

import pytest
from pathlib import Path
from scripts.changelog.validate_changelog import validate_changelog


def test_valid_changelog_passes():
    """Valid Keep a Changelog format should pass validation."""
    valid_content = """# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New feature description

## [1.0.0] - 2026-02-01

### Added
- Initial release
"""
    result = validate_changelog(valid_content)
    assert result["valid"] is True
    assert len(result["errors"]) == 0


def test_missing_unreleased_section_fails():
    """CHANGELOG without [Unreleased] section should fail."""
    invalid_content = """# Changelog

## [1.0.0] - 2026-02-01

### Added
- Initial release
"""
    result = validate_changelog(invalid_content)
    assert result["valid"] is False
    assert any("Unreleased" in err for err in result["errors"])


def test_invalid_semver_fails():
    """CHANGELOG with invalid semver should fail."""
    invalid_content = """# Changelog

## [Unreleased]

## [1.0] - 2026-02-01

### Added
- Initial release
"""
    result = validate_changelog(invalid_content)
    assert result["valid"] is False
    assert any("semantic version" in err.lower() for err in result["errors"])


def test_invalid_category_fails():
    """CHANGELOG with invalid category should fail."""
    invalid_content = """# Changelog

## [Unreleased]

### InvalidCategory
- Some change

## [1.0.0] - 2026-02-01

### Added
- Initial release
"""
    result = validate_changelog(invalid_content)
    assert result["valid"] is False
    assert any("category" in err.lower() for err in result["errors"])
