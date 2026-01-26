// Fix storage policies directly via Supabase API
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eynaufdznthvmylsaffs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5bmF1ZmR6bnRodm15bHNhZmZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzUyODgsImV4cCI6MjA4MzU1MTI4OH0.clDuIv4I7NQRAciK7y8fyq3mz5xDdqLk_NZTcF2ZkJs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
  console.log('Testing storage bucket access...\n');

  // Try to list buckets
  const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
  if (bucketsErr) {
    console.log('Error listing buckets:', bucketsErr.message);
  } else {
    console.log('Available buckets:');
    buckets.forEach(b => console.log(`  - ${b.name} (public: ${b.public})`));
  }

  // Try a simple test upload to report-signatures
  console.log('\nTesting upload to report-signatures...');
  const testData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header
  const testPath = `test/${Date.now()}.png`;

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('report-signatures')
    .upload(testPath, testData, { contentType: 'image/png' });

  if (uploadErr) {
    console.log('Upload error:', uploadErr.message);
    console.log('Full error:', JSON.stringify(uploadErr, null, 2));
  } else {
    console.log('Upload successful!', uploadData);

    // Clean up test file
    await supabase.storage.from('report-signatures').remove([testPath]);
    console.log('Test file cleaned up');
  }
}

testUpload().catch(console.error);
