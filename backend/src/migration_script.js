require('dotenv').config();
const supabase = require('./supabaseClient');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

// --- CẤU HÌNH ---
// Email của người dùng sẽ sở hữu tất cả dữ liệu được di chuyển
const TARGET_USER_EMAIL = 'maitrungtruc2002@gmail.com';
// Đường dẫn đến file SQL dump (tính từ thư mục gốc của backend)
const SQL_DUMP_PATH = path.join(__dirname, '../tienziven_tool_dev.sql');

/**
 * Lấy ID của người dùng mục tiêu từ Supabase Auth.
 */
async function getTargetUserId() {
  console.log(`Finding user with email: ${TARGET_USER_EMAIL}...`);
  // Cần dùng service_role key để truy cập auth.users
  const { data: { users }, error } = await supabase.auth.admin.listUsers();

  if (error) {
    throw new Error(`Error fetching users: ${error.message}`);
  }
  
  const targetUser = users.find(u => u.email === TARGET_USER_EMAIL);

  if (!targetUser) {
    throw new Error(`User with email ${TARGET_USER_EMAIL} not found in Supabase. Please make sure the user exists.`);
  }

  console.log(`User found. ID: ${targetUser.id}`);
  return targetUser.id;
}

/**
 * Xử lý một dòng giá trị từ câu lệnh INSERT của MySQL.
 * Ví dụ: ('id_val', 'name_val', 123) -> ['id_val', 'name_val', 123]
 */
function parseSqlInsertValues(valuesString) {
    // Tạm thời dùng một phương pháp đơn giản, có thể cần cải tiến nếu dữ liệu phức tạp
    // Loại bỏ dấu ngoặc đơn ở đầu và cuối
    const cleaned = valuesString.trim().slice(1, -1);
    // Tách các giá trị, xử lý các chuỗi có dấu phẩy
    const parts = cleaned.match(/(?:'[^']*'|[^,]+)/g);
    return parts.map(p => {
        p = p.trim();
        // Bỏ dấu nháy đơn và unescape
        if (p.startsWith("'") && p.endsWith("'")) {
            return p.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, "\\");
        }
        // Chuyển đổi 'NULL' thành null
        if (p === 'NULL') return null;
        // Chuyển thành số nếu có thể
        if (!isNaN(p)) return Number(p);
        return p;
    });
}


/**
 * Di chuyển dữ liệu từ bảng `project`.
 */
async function migrateProjects(userId, oldToNewIdMap) {
  console.log('Starting project migration...');
  const fileStream = fs.createReadStream(SQL_DUMP_PATH);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let projectsToInsert = [];
  const BATCH_SIZE = 50;

  for await (const line of rl) {
    if (line.startsWith('INSERT INTO `project` VALUES')) {
      // Tách các bộ giá trị (row1), (row2), ...
      const valuesRegex = /\(([^)]+)\)/g;
      const valueMatches = line.match(valuesRegex);

      if (valueMatches) {
        for (const match of valueMatches) {
          const values = parseSqlInsertValues(match);
          const [old_id, name, slug, language, domain, country, device] = values;
          
          projectsToInsert.push({
            name,
            website_url: domain,
            slug,
            language,
            country,
            device,
            user_id: userId
          });

          // Lưu lại old_id để dùng cho việc ánh xạ sau này
          oldToNewIdMap[old_id] = { temp: true, data: projectsToInsert[projectsToInsert.length - 1] };
        }
      }
    }
  }

  if (projectsToInsert.length === 0) {
    console.log('No projects found in SQL dump.');
    return;
  }

  console.log(`Found ${projectsToInsert.length} projects to migrate. Inserting in batches...`);

  // Chèn vào DB và cập nhật map
  const { data, error } = await supabase.from('projects').insert(projectsToInsert).select();
  
  if (error) {
    throw new Error(`Failed to insert projects: ${error.message}`);
  }

  // Cập nhật map với new IDs
  data.forEach(newProject => {
      const oldProjectData = JSON.stringify({
          name: newProject.name,
          website_url: newProject.website_url,
          slug: newProject.slug,
          language: newProject.language,
          country: newProject.country,
          device: newProject.device,
          user_id: userId
      });

      for (const oldId in oldToNewIdMap) {
          if (oldToNewIdMap[oldId].temp && JSON.stringify(oldToNewIdMap[oldId].data) === oldProjectData) {
              oldToNewIdMap[oldId] = newProject.id;
              break;
          }
      }
  });


  console.log(`Successfully migrated ${data.length} projects.`);
}

/**
 * Di chuyển dữ liệu từ bảng `keyword`.
 */
async function migrateKeywords(userId, oldToNewIdMap) {
    console.log('Starting keyword migration...');
    const fileStream = fs.createReadStream(SQL_DUMP_PATH);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
    
    let keywordsToInsert = [];
    const BATCH_SIZE = 100;
    let totalKeywordsFound = 0;
    let unmappedKeywords = 0;

    for await (const line of rl) {
        if (line.startsWith('INSERT INTO `keyword` VALUES')) {
            const valuesRegex = /\(([^)]+)\)/g;
            const valueMatches = line.match(valuesRegex);

            if (valueMatches) {
                for (const match of valueMatches) {
                    totalKeywordsFound++;
                    const values = parseSqlInsertValues(match);
                    
                    // Cấu trúc thực tế của bảng keyword cũ:
                    // [id, content, pos, bestPos, fullUrl, lastChecked, projectId, hasError]
                    if (values.length >= 8) {
                        const [old_id, content, pos, bestPos, fullUrl, lastChecked, projectId, hasError] = values;
                        
                        // Kiểm tra xem project ID này đã được migrate chưa
                        const new_project_id = oldToNewIdMap[projectId];
                        
                        if (new_project_id) {
                            // Tạo object keyword mới với cấu trúc Supabase hiện tại
                            const keywordData = {
                                keyword_text: content,
                                project_id: new_project_id,
                                user_id: userId
                            };
                            
                            keywordsToInsert.push(keywordData);
                        } else {
                            console.warn(`Keyword "${content}" skipped: Project ID ${projectId} not found in migrated projects`);
                            unmappedKeywords++;
                        }
                    } else {
                        console.warn(`Invalid keyword data structure: Expected 8 columns, got ${values.length}`);
                        unmappedKeywords++;
                    }

                    if (keywordsToInsert.length >= BATCH_SIZE) {
                        const { error } = await supabase.from('keywords').insert(keywordsToInsert);
                        if (error) console.error(`Batch insert failed: ${error.message}`);
                        keywordsToInsert = [];
                    }
                }
            }
        }
    }

    // Insert a final batch if any keywords are left
    if (keywordsToInsert.length > 0) {
        const { error } = await supabase.from('keywords').insert(keywordsToInsert);
        if (error) console.error(`Final batch insert failed: ${error.message}`);
    }

    console.log(`Found ${totalKeywordsFound} keywords in total.`);
    if (unmappedKeywords > 0) {
        console.warn(`${unmappedKeywords} keywords were skipped because their original project could not be found.`);
    }
    console.log(`Successfully migrated ${totalKeywordsFound - unmappedKeywords} keywords.`);
}


async function main() {
  try {
    console.log('--- Starting Data Migration Script ---');
    
    const userId = await getTargetUserId();
    
    const oldToNewIdMap = {};

    await migrateProjects(userId, oldToNewIdMap);
    await migrateKeywords(userId, oldToNewIdMap);
    
    // Thêm các hàm migrate cho schema, tags ở đây nếu cần

    console.log('\n--- Migration finished successfully! ---');
  } catch (error) {
    console.error('\n--- MIGRATION FAILED ---');
    console.error(error.message);
    process.exit(1);
  }
}

main();
