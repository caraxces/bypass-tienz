require('dotenv').config({ path: './.env' });
const supabase = require('./supabaseClient');

async function updateSupabaseSchema() {
    console.log('🔧 Updating Supabase database schema...\n');
    
    try {
        // 1. Cập nhật bảng projects - thêm các cột còn thiếu
        console.log('📋 Updating projects table...');
        
        // Thêm cột slug nếu chưa có
        try {
            const { error: slugError } = await supabase.rpc('exec_sql', {
                sql: 'ALTER TABLE projects ADD COLUMN IF NOT EXISTS slug VARCHAR(500);'
            });
            if (slugError) {
                console.log('   → Slug column already exists or cannot be added');
            } else {
                console.log('   ✅ Added slug column');
            }
        } catch (e) {
            console.log('   → Cannot add slug column automatically');
        }
        
        // Thêm cột language nếu chưa có
        try {
            const { error: langError } = await supabase.rpc('exec_sql', {
                sql: 'ALTER TABLE projects ADD COLUMN IF NOT EXISTS language VARCHAR(50) DEFAULT \'vi\';'
            });
            if (langError) {
                console.log('   → Language column already exists or cannot be added');
            } else {
                console.log('   ✅ Added language column');
            }
        } catch (e) {
            console.log('   → Cannot add language column automatically');
        }
        
        // Thêm cột country nếu chưa có
        try {
            const { error: countryError } = await supabase.rpc('exec_sql', {
                sql: 'ALTER TABLE projects ADD COLUMN IF NOT EXISTS country VARCHAR(50) DEFAULT \'Vietnam\';'
            });
            if (countryError) {
                console.log('   → Country column already exists or cannot be added');
            } else {
                console.log('   ✅ Added country column');
            }
        } catch (e) {
            console.log('   → Cannot add country column automatically');
        }
        
        // Thêm cột device nếu chưa có
        try {
            const { error: deviceError } = await supabase.rpc('exec_sql', {
                sql: 'ALTER TABLE projects ADD COLUMN IF NOT EXISTS device VARCHAR(50) DEFAULT \'desktop\';'
            });
            if (deviceError) {
                console.log('   → Device column already exists or cannot be added');
            } else {
                console.log('   ✅ Added device column');
            }
        } catch (e) {
            console.log('   → Cannot add device column automatically');
        }
        
        // 2. Cập nhật bảng keywords - thêm các cột từ database cũ
        console.log('\n📋 Updating keywords table...');
        
        // Thêm cột position (pos từ DB cũ)
        try {
            const { error: posError } = await supabase.rpc('exec_sql', {
                sql: 'ALTER TABLE keywords ADD COLUMN IF NOT EXISTS position INTEGER;'
            });
            if (posError) {
                console.log('   → Position column already exists or cannot be added');
            } else {
                console.log('   ✅ Added position column');
            }
        } catch (e) {
            console.log('   → Cannot add position column automatically');
        }
        
        // Thêm cột best_position (bestPos từ DB cũ)
        try {
            const { error: bestPosError } = await supabase.rpc('exec_sql', {
                sql: 'ALTER TABLE keywords ADD COLUMN IF NOT EXISTS best_position INTEGER;'
            });
            if (bestPosError) {
                console.log('   → Best position column already exists or cannot be added');
            } else {
                console.log('   ✅ Added best position column');
            }
        } catch (e) {
            console.log('   → Cannot add best position column automatically');
        }
        
        // Thêm cột full_url (fullUrl từ DB cũ)
        try {
            const { error: urlError } = await supabase.rpc('exec_sql', {
                sql: 'ALTER TABLE keywords ADD COLUMN IF NOT EXISTS full_url TEXT;'
            });
            if (urlError) {
                console.log('   → Full URL column already exists or cannot be added');
            } else {
                console.log('   ✅ Added full URL column');
            }
        } catch (e) {
            console.log('   → Cannot add full URL column automatically');
        }
        
        // Thêm cột last_checked (lastChecked từ DB cũ)
        try {
            const { error: checkedError } = await supabase.rpc('exec_sql', {
                sql: 'ALTER TABLE keywords ADD COLUMN IF NOT EXISTS last_checked TIMESTAMP WITH TIME ZONE;'
            });
            if (checkedError) {
                console.log('   → Last checked column already exists or cannot be added');
            } else {
                console.log('   ✅ Added last checked column');
            }
        } catch (e) {
            console.log('   → Cannot add last checked column automatically');
        }
        
        // Thêm cột has_error (hasError từ DB cũ)
        try {
            const { error: errorError } = await supabase.rpc('exec_sql', {
                sql: 'ALTER TABLE keywords ADD COLUMN IF NOT EXISTS has_error BOOLEAN DEFAULT FALSE;'
            });
            if (errorError) {
                console.log('   → Has error column already exists or cannot be added');
            } else {
                console.log('   ✅ Added has error column');
            }
        } catch (e) {
            console.log('   → Cannot add has error column automatically');
        }
        
        // 3. Tạo bảng crawl_history nếu chưa có
        console.log('\n📋 Creating crawl_history table...');
        try {
            const { error: crawlError } = await supabase.rpc('exec_sql', {
                sql: `
                    CREATE TABLE IF NOT EXISTS crawl_history (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        start_url TEXT NOT NULL,
                        status VARCHAR(50) DEFAULT 'running',
                        pages_crawled INTEGER DEFAULT 0,
                        max_pages INTEGER DEFAULT 10000,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        finished_at TIMESTAMP WITH TIME ZONE,
                        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
                    );
                `
            });
            if (crawlError) {
                console.log('   → Crawl history table already exists or cannot be created');
            } else {
                console.log('   ✅ Created crawl_history table');
            }
        } catch (e) {
            console.log('   → Cannot create crawl_history table automatically');
        }
        
        // 4. Tạo bảng schemas nếu chưa có
        console.log('\n📋 Creating schemas table...');
        try {
            const { error: schemasError } = await supabase.rpc('exec_sql', {
                sql: `
                    CREATE TABLE IF NOT EXISTS schemas (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        name VARCHAR(255) NOT NULL,
                        content JSONB NOT NULL,
                        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                `
            });
            if (schemasError) {
                console.log('   → Schemas table already exists or cannot be created');
            } else {
                console.log('   ✅ Created schemas table');
            }
        } catch (e) {
            console.log('   → Cannot create schemas table automatically');
        }
        
        console.log('\n🎯 Schema update completed!');
        console.log('\n📝 Note: If some columns/tables could not be added automatically,');
        console.log('   you may need to add them manually in the Supabase dashboard.');
        
    } catch (error) {
        console.error('❌ Error updating schema:', error);
    }
}

updateSupabaseSchema();
