
import { supabase } from './src/lib/customSupabaseClient.js';

async function restorePla600Video() {
    console.log("Restoring Video for 'PLA 600 AUTO'...");

    // 1. Fetch current data
    const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('project', 'PLA 600 AUTO')
        .single();

    if (error) {
        console.error("Error fetching project:", error);
        return;
    }

    if (!data) {
        console.error("Project not found!");
        return;
    }

    // 2. Prepare update
    // The video URL was found at data.video_url: "https://www.youtube.com/watch?v=NqcUKqJ9J0o"
    // We need to put it into sections_config -> video -> content

    // Check if sections_config exists and is an array
    if (!data.sections_config || !Array.isArray(data.sections_config)) {
        console.error("Invalid sections_config structure");
        return;
    }

    const updatedSections = data.sections_config.map(section => {
        if (section.id === 'video') {
            return {
                ...section,
                content: data.video_url || "https://www.youtube.com/watch?v=NqcUKqJ9J0o",
                isVisible: true
            };
        }
        return section;
    });

    // 3. Update Supabase
    const { error: updateError } = await supabase
        .from('quotations')
        .update({ sections_config: updatedSections })
        .eq('id', data.id);

    if (updateError) {
        console.error("Error updating project:", updateError);
    } else {
        console.log("Successfully restored video section!");
    }
}

restorePla600Video();
