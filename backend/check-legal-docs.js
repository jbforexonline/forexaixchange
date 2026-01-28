/**
 * Quick script to check if legal documents exist in the database
 * Run this on Render shell: node backend/check-legal-docs.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking for legal documents in database...\n');
  
  try {
    const terms = await prisma.legalDocument.findMany({
      where: { type: 'TERMS' }
    });
    
    const privacy = await prisma.legalDocument.findMany({
      where: { type: 'PRIVACY' }
    });
    
    console.log(`✅ Found ${terms.length} Terms document(s)`);
    terms.forEach(doc => {
      console.log(`  - Version ${doc.version}, Active: ${doc.isActive}, Created: ${doc.createdAt}`);
    });
    
    console.log(`\n✅ Found ${privacy.length} Privacy document(s)`);
    privacy.forEach(doc => {
      console.log(`  - Version ${doc.version}, Active: ${doc.isActive}, Created: ${doc.createdAt}`);
    });
    
    const activeTerms = terms.find(d => d.isActive);
    const activePrivacy = privacy.find(d => d.isActive);
    
    if (!activeTerms || !activePrivacy) {
      console.log('\n❌ PROBLEM: No active legal documents found!');
      console.log('   Registration will fail until you seed the database.');
      console.log('   Run: cd backend && npx prisma db seed');
    } else {
      console.log('\n✅ All good! Active legal documents found.');
      console.log('   Registration should work correctly.');
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    console.error('   Make sure DATABASE_URL is set correctly');
  } finally {
    await prisma.$disconnect();
  }
}

main();
