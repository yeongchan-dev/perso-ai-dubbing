#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function testUpload() {
  console.log('Testing upload endpoint with improved error handling...\n');

  const serverUrl = 'http://localhost:3001'; // Using the port from the server output

  // Test 1: Upload with no file
  console.log('Test 1: Upload with no file');
  try {
    const formData = new FormData();
    const response = await fetch(`${serverUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('---\n');

  // Test 2: Upload with invalid file type
  console.log('Test 2: Upload with invalid file type (.txt)');
  try {
    // Create a small text file for testing
    const testContent = 'This is a test file';
    const blob = new Blob([testContent], { type: 'text/plain' });
    const file = new File([blob], 'test.txt', { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${serverUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('---\n');

  // Test 3: Upload with valid file type but empty content
  console.log('Test 3: Upload with valid file type but empty content (.mp3)');
  try {
    // Create an empty mp3 file for testing
    const emptyBlob = new Blob([], { type: 'audio/mpeg' });
    const file = new File([emptyBlob], 'empty.mp3', { type: 'audio/mpeg' });

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${serverUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('---\n');

  // Test 4: Upload with valid small mp3 file
  console.log('Test 4: Upload with valid small mp3 file');
  try {
    // Create a small fake mp3 file for testing (just some bytes with mp3 extension)
    const testContent = 'ID3\x03\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'; // Fake MP3 header
    const blob = new Blob([testContent], { type: 'audio/mpeg' });
    const file = new File([blob], 'test.mp3', { type: 'audio/mpeg' });

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${serverUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ Upload successful! File saved as:', result.fileName);

      // Verify the file was actually saved
      const uploadsDir = path.join(__dirname, 'uploads');
      const filePath = path.join(uploadsDir, result.fileName);
      if (fs.existsSync(filePath)) {
        console.log('✅ File verified on disk');
        const stats = fs.statSync(filePath);
        console.log(`   File size: ${stats.size} bytes`);

        // Clean up test file
        fs.unlinkSync(filePath);
        console.log('🧹 Test file cleaned up');
      } else {
        console.log('❌ File not found on disk!');
      }
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
  console.log('---\n');

  console.log('Upload tests completed!');
}

// Check if we're running in a browser-like environment (for FormData and fetch)
if (typeof FormData === 'undefined' || typeof fetch === 'undefined') {
  console.log('This test requires a modern browser environment or Node.js 18+');
  console.log('You can also test manually through the web UI at http://localhost:3001/dashboard');
} else {
  testUpload();
}