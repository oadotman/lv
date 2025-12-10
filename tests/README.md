# CallIQ Test Suite

## Overview

This directory contains comprehensive test suites for the CallIQ call processing workflow. The tests validate the entire pipeline from file upload/URL import through transcription to CRM data extraction.

## Test Files

### 1. `integration-test.js`
Quick integration test that verifies:
- Environment configuration
- Database connectivity
- API endpoints
- Database schema
- Storage configuration
- Basic workflow simulation

**Run time:** ~10 seconds

### 2. `comprehensive-e2e-test.js`
Full end-to-end test covering:
- File upload workflow (multiple file types)
- URL import from various platforms (Zoom, Google Drive, Dropbox, OneDrive)
- URL validation (both valid and invalid URLs)
- Processing monitoring with progress tracking
- Data verification (transcripts, CRM fields, usage metrics)
- Edge case testing
- Concurrent processing
- Performance testing

**Run time:** 5-10 minutes (depending on processing)

### 3. `e2e-call-processing.test.js`
Basic E2E test focusing on:
- User authentication
- Single file upload
- Processing monitoring
- Complete data verification
- Retry logic testing
- Cleanup procedures

**Run time:** 3-5 minutes

## Prerequisites

1. **Environment Variables**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   ASSEMBLYAI_API_KEY=your-assemblyai-key
   OPENAI_API_KEY=your-openai-key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

2. **Database Setup**
   - Supabase project with all required tables
   - Storage bucket named `call-audio` (must be public)

3. **API Services**
   - Valid AssemblyAI API key with credits
   - Valid OpenAI API key with credits

## Running Tests

### Quick Test (Recommended for CI/CD)
```bash
npm run test:quick
```
Runs basic integration tests without actual file processing.

### Full E2E Test
```bash
npm run test:e2e
```
Runs comprehensive end-to-end tests including actual file uploads and processing.

### Basic E2E Test
```bash
npm run test:e2e:basic
```
Runs simplified E2E test with a single file upload.

### All Tests
```bash
npm run test:all
```
Runs both quick and comprehensive tests sequentially.

## Test Options

### Skip Cleanup
To keep test data for debugging:
```bash
SKIP_CLEANUP=true npm run test:e2e
```

### Debug Mode
For verbose output:
```bash
DEBUG=true npm run test:e2e
```

### Custom Test Audio Files
Place test audio files in the tests directory:
- `test-audio-1.mp3` (2 minutes)
- `test-audio-2.m4a` (3 minutes)
- `test-audio-3.wav` (4 minutes)

If not present, mock files will be created automatically.

## Test Coverage

### File Upload Testing
- ✅ Multiple file formats (MP3, M4A, WAV)
- ✅ File size validation
- ✅ MIME type handling
- ✅ Direct storage upload
- ✅ Presigned URL generation
- ✅ Upload completion

### URL Import Testing
- ✅ Zoom recordings
- ✅ Google Drive files
- ✅ Dropbox files
- ✅ OneDrive files
- ✅ Generic URLs
- ✅ Invalid URL rejection
- ✅ Platform-specific validation

### Processing Testing
- ✅ Queue system
- ✅ Progress monitoring
- ✅ Retry logic (3 attempts)
- ✅ Error handling
- ✅ Timeout handling
- ✅ Concurrent processing

### Data Verification
- ✅ Transcript creation
- ✅ Speaker identification
- ✅ Utterance extraction
- ✅ CRM field extraction
- ✅ Typed notes integration
- ✅ Usage metrics recording
- ✅ Organization billing
- ✅ Notification creation

### Edge Cases
- ✅ Empty typed notes
- ✅ Very long typed notes (5000 chars)
- ✅ Special characters/emojis
- ✅ No participants
- ✅ Many participants (10+)
- ✅ Missing customer info
- ✅ Invalid MIME types
- ✅ Zero duration
- ✅ Very long duration (2+ hours)

## Performance Benchmarks

Expected performance on standard hardware:
- Small file (1MB): < 1 second upload
- Medium file (10MB): < 5 seconds upload
- Large file (50MB): < 20 seconds upload
- Transcription: 10-30% of audio duration
- CRM extraction: 5-10 seconds

## Troubleshooting

### Test Failures

1. **Environment Check Fails**
   - Verify all environment variables are set
   - Check `.env.local` file exists

2. **Database Connection Fails**
   - Check Supabase service key is valid
   - Verify Supabase URL is correct
   - Ensure database is accessible

3. **Storage Bucket Error**
   - Verify `call-audio` bucket exists
   - Ensure bucket is set to public
   - Check storage permissions

4. **Processing Timeout**
   - Check AssemblyAI API key has credits
   - Verify OpenAI API key is active
   - Increase timeout in test config

5. **Cleanup Fails**
   - Non-critical, data may remain in database
   - Manual cleanup via Supabase dashboard

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Run integration tests
      env:
        NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        ASSEMBLYAI_API_KEY: ${{ secrets.ASSEMBLYAI_KEY }}
        OPENAI_API_KEY: ${{ secrets.OPENAI_KEY }}
        NEXT_PUBLIC_APP_URL: http://localhost:3000
      run: npm run test:quick
```

## Writing New Tests

To add new test cases:

1. Add test function to the `tests` object
2. Include proper logging with `log.info()`, `log.success()`, `log.error()`
3. Handle cleanup in finally blocks
4. Return boolean for pass/fail
5. Update this README with new test coverage

## Support

For issues or questions about tests:
1. Check test output for specific error messages
2. Enable DEBUG mode for verbose logging
3. Review Supabase logs for database errors
4. Check API service dashboards for quota issues