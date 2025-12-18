import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { supabaseAdmin } from "../utils/supabaseClient.js";
import { notificationService } from "./notification.controller.js";

const getAllConsultants = asyncHandler(async (req, res) => {
  const { data: consultants, error } = await supabaseAdmin
    .from("consultants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError(500, "Failed to fetch consultants");
  }

  res.status(200).json(new ApiResponse(200, consultants || [], "Consultants fetched successfully"));
});

const getConsultantById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: consultant, error } = await supabaseAdmin
    .from("consultants")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !consultant) {
    throw new ApiError(404, "Consultant not found");
  }

  res.status(200).json(new ApiResponse(200, consultant, "Consultant fetched successfully"));
});

const createConsultant = asyncHandler(async (req, res) => {
  const consultantData = req.body;
  const cvFile = req.file;
  const currentUser = req.user;
  
  // Debug: Log entire request body to see what multer parsed
  console.log('=== CREATE CONSULTANT DEBUG ===');
  console.log('Full req.body keys:', Object.keys(req.body));
  console.log('Full req.body:', JSON.stringify(req.body, null, 2));
  console.log('Received otherLanguages in create:', consultantData.otherLanguages, 'type:', typeof consultantData.otherLanguages);
  console.log('Received other_languages in create:', consultantData.other_languages, 'type:', typeof consultantData.other_languages);
  console.log('Raw otherLanguages value:', consultantData.otherLanguages);
  console.log('Raw other_languages value:', consultantData.other_languages);

  // Handle CV file upload if provided
  let cvFileUrl = null;
  if (cvFile) {
    const fileExt = cvFile.originalname.split(".").pop();
    const fileName = `consultant-cv-${Date.now()}.${fileExt}`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("consultant-cvs")
      .upload(fileName, cvFile.buffer, {
        contentType: cvFile.mimetype,
        upsert: false,
      });

    if (!uploadError && uploadData) {
      const { data: publicUrlData } = supabaseAdmin.storage
        .from("consultant-cvs")
        .getPublicUrl(fileName);
      cvFileUrl = publicUrlData.publicUrl;
    }
  }

  // Parse JSON fields if they're strings
  let tags = consultantData.tags;
  let experiences = consultantData.experiences;
  let availability = consultantData.availability;
  // Try both camelCase and snake_case field names for otherLanguages
  let otherLanguages = consultantData.otherLanguages !== undefined 
    ? consultantData.otherLanguages 
    : (consultantData.other_languages !== undefined ? consultantData.other_languages : undefined);
  let testResults = consultantData.testResults || consultantData.test_results;
  let qualityControl = consultantData.qualityControl || consultantData.quality_control;

  if (typeof tags === "string") {
    try {
      tags = JSON.parse(tags);
    } catch (e) {
      tags = [];
    }
  }

  if (typeof experiences === "string") {
    try {
      experiences = JSON.parse(experiences);
    } catch (e) {
      experiences = [];
    }
  }

  if (typeof availability === "string") {
    try {
      availability = JSON.parse(availability);
    } catch (e) {
      availability = { status: "available", date: null };
    }
  }

  // Handle otherLanguages - parse if string, ensure it's always an array
  console.log('Processing otherLanguages:', otherLanguages, 'type:', typeof otherLanguages);
  if (otherLanguages === undefined || otherLanguages === null) {
    otherLanguages = [];
  } else if (typeof otherLanguages === "string") {
    try {
      otherLanguages = JSON.parse(otherLanguages);
      // Ensure it's an array after parsing
      if (!Array.isArray(otherLanguages)) {
        console.log('Parsed otherLanguages is not an array, defaulting to []');
        otherLanguages = [];
      }
    } catch (e) {
      console.log('Error parsing otherLanguages:', e);
      otherLanguages = [];
    }
  } else if (!Array.isArray(otherLanguages)) {
    // If it's not a string and not an array, default to empty array
    console.log('otherLanguages is not an array, defaulting to []');
    otherLanguages = [];
  }
  console.log('Final otherLanguages value:', otherLanguages);

  if (typeof testResults === "string") {
    try {
      testResults = JSON.parse(testResults);
    } catch (e) {
      testResults = [];
    }
  }

  if (typeof qualityControl === "string") {
    try {
      qualityControl = JSON.parse(qualityControl);
    } catch (e) {
      qualityControl = { references: [], clientFeedbacks: [] };
    }
  }

  const newConsultant = {
    name: consultantData.name,
    email: consultantData.email || null,
    phone: consultantData.phone || null,
    location: consultantData.location || null,
    role: consultantData.role || null,
    company: consultantData.company || null,
    tags: tags || [],
    years_of_experience: parseInt(consultantData.yearsOfExperience || consultantData.years_of_experience) || 0,
    commercial_id: consultantData.commercialId || consultantData.commercial_id || null,
    availability: availability || { status: "available", date: null },
    cv_file_url: cvFileUrl || consultantData.cvFileUrl || null,
    templated_cv_url: consultantData.templatedCvUrl || null,
    price: parseFloat(consultantData.price) || null,
    english_level: consultantData.englishLevel || consultantData.english_level || null,
    is_permifier: consultantData.isPermifier === true || consultantData.isPermifier === "true",
    is_relocatable: consultantData.isRelocatable === true || consultantData.isRelocatable === "true",
    nationality: consultantData.nationality || null,
    age: parseInt(consultantData.age) || null,
    is_seven_academy: consultantData.isSevenAcademy === true || consultantData.isSevenAcademy === "true",
    seven_academy_training: consultantData.sevenAcademyTraining
      ? (typeof consultantData.sevenAcademyTraining === "string"
          ? JSON.parse(consultantData.sevenAcademyTraining)
          : consultantData.sevenAcademyTraining)
      : null,
    is_favorite: consultantData.isFavorite === true || consultantData.isFavorite === "true",
    is_blacklisted: consultantData.isBlacklisted === true || consultantData.isBlacklisted === "true",
    is_excluded: consultantData.isExcluded === true || consultantData.isExcluded === "true",
    blacklist_reason: consultantData.blacklistReason || null,
    blacklist_date: consultantData.blacklistDate || null,
    next_followup: consultantData.nextFollowup || null,
    color: consultantData.color || null,
    city: consultantData.city && consultantData.city.trim() ? consultantData.city.trim() : null,
    department: consultantData.department && consultantData.department.trim() ? consultantData.department.trim() : null,
    latitude: consultantData.latitude !== null && consultantData.latitude !== '' && consultantData.latitude !== undefined
      ? parseFloat(consultantData.latitude) 
      : null,
    longitude: consultantData.longitude !== null && consultantData.longitude !== '' && consultantData.longitude !== undefined
      ? parseFloat(consultantData.longitude) 
      : null,
    experiences: experiences || [],
    other_languages: Array.isArray(otherLanguages) ? otherLanguages : [],
    test_results: testResults || [],
    quality_control: qualityControl || { references: [], clientFeedbacks: [] },
    last_activity: new Date().toISOString(),
    created_by: currentUser.id,
  };
  
  // Debug: Log the other_languages value being inserted
  console.log('Inserting other_languages into Supabase:', newConsultant.other_languages, 'Type:', typeof newConsultant.other_languages, 'Is Array:', Array.isArray(newConsultant.other_languages));

  // Debug: Log entire newConsultant object before insert
  console.log('Full newConsultant object before insert:', JSON.stringify(newConsultant, null, 2));
  
  const { data: createdConsultant, error } = await supabaseAdmin
    .from("consultants")
    .insert(newConsultant)
    .select("*")
    .single();
  
  // Debug: Log what was actually created
  if (createdConsultant) {
    console.log('Created consultant other_languages:', createdConsultant.other_languages);
  }
  if (error) {
    console.error('Supabase insert error:', error);
  }

  if (error) {
    console.log(error)
    throw new ApiError(500, `Failed to create consultant: ${error.message}`);
  }

  // Create notification if consultant is assigned to different user
  if (createdConsultant.commercial_id && createdConsultant.commercial_id !== currentUser.id) {
    try {
      const io = req.app.get('io');
      await notificationService.addNotification({
        type: "assignment",
        message: `${currentUser.name} a assigné ${createdConsultant.name} à vous.`,
        entity_type: "consultant",
        entity_id: createdConsultant.id,
        recipient_id: createdConsultant.commercial_id,
      }, io);
    } catch (notifError) {
      console.error("Notification error:", notifError);
    }
  }

  // Emit Socket.IO event for real-time updates
  const io = req.app.get('io');
  if (io && createdConsultant) {
    io.emit('consultant:created', createdConsultant);
  }

  res.status(201).json(new ApiResponse(201, createdConsultant, "Consultant created successfully"));
});

const updateConsultant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const consultantData = req.body;
  const cvFile = req.file;
  const currentUser = req.user;

  // Check if consultant exists
  const { data: existingConsultant, error: fetchError } = await supabaseAdmin
    .from("consultants")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !existingConsultant) {
    throw new ApiError(404, "Consultant not found");
  }

  // Handle CV file upload if provided
  let cvFileUrl = existingConsultant.cv_file_url;
  if (cvFile) {
    const fileExt = cvFile.originalname.split(".").pop();
    const fileName = `consultant-cv-${id}-${Date.now()}.${fileExt}`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("consultant-cvs")
      .upload(fileName, cvFile.buffer, {
        contentType: cvFile.mimetype,
        upsert: false,
      });

    if (!uploadError && uploadData) {
      const { data: publicUrlData } = supabaseAdmin.storage
        .from("consultant-cvs")
        .getPublicUrl(fileName);
      cvFileUrl = publicUrlData.publicUrl;
    }
  }

  // Parse JSON fields if they're strings
  const updateData = {};
  if (consultantData.name !== undefined) updateData.name = consultantData.name;
  if (consultantData.email !== undefined) updateData.email = consultantData.email;
  if (consultantData.phone !== undefined) updateData.phone = consultantData.phone;
  if (consultantData.location !== undefined) updateData.location = consultantData.location;
  if (consultantData.role !== undefined) updateData.role = consultantData.role;
  if (consultantData.company !== undefined) updateData.company = consultantData.company;
  if (consultantData.color !== undefined) updateData.color = consultantData.color;
  if (consultantData.price !== undefined) updateData.price = parseFloat(consultantData.price) || null;
  if (consultantData.englishLevel !== undefined || consultantData.english_level !== undefined)
    updateData.english_level = consultantData.englishLevel || consultantData.english_level;
  if (consultantData.nationality !== undefined) updateData.nationality = consultantData.nationality;
  if (consultantData.age !== undefined) updateData.age = parseInt(consultantData.age) || null;
  if (consultantData.nextFollowup !== undefined) updateData.next_followup = consultantData.nextFollowup || null;
  if (consultantData.templatedCvUrl !== undefined)
    updateData.templated_cv_url = consultantData.templatedCvUrl;
  if (cvFileUrl) updateData.cv_file_url = cvFileUrl;

  if (consultantData.tags !== undefined) {
    try {
      updateData.tags =
        typeof consultantData.tags === "string" ? JSON.parse(consultantData.tags) : consultantData.tags;
    } catch (e) {
      updateData.tags = [];
    }
  }

  if (consultantData.experiences !== undefined) {
    try {
      updateData.experiences =
        typeof consultantData.experiences === "string"
          ? JSON.parse(consultantData.experiences)
          : consultantData.experiences;
    } catch (e) {
      updateData.experiences = [];
    }
  }

  if (consultantData.availability !== undefined) {
    try {
      updateData.availability =
        typeof consultantData.availability === "string"
          ? JSON.parse(consultantData.availability)
          : consultantData.availability;
    } catch (e) {
      updateData.availability = { status: "available", date: null };
    }
  }

  if (consultantData.yearsOfExperience !== undefined || consultantData.years_of_experience !== undefined) {
    updateData.years_of_experience =
      parseInt(consultantData.yearsOfExperience || consultantData.years_of_experience) || 0;
  }

  if (consultantData.commercialId !== undefined || consultantData.commercial_id !== undefined) {
    updateData.commercial_id = consultantData.commercialId || consultantData.commercial_id;
  }

  if (consultantData.isPermifier !== undefined || consultantData.is_permifier !== undefined) {
    updateData.is_permifier =
      consultantData.isPermifier === true ||
      consultantData.isPermifier === "true" ||
      consultantData.is_permifier === true;
  }

  if (consultantData.isRelocatable !== undefined || consultantData.is_relocatable !== undefined) {
    updateData.is_relocatable =
      consultantData.isRelocatable === true ||
      consultantData.isRelocatable === "true" ||
      consultantData.is_relocatable === true;
  }

  if (consultantData.isSevenAcademy !== undefined || consultantData.is_seven_academy !== undefined) {
    updateData.is_seven_academy =
      consultantData.isSevenAcademy === true ||
      consultantData.isSevenAcademy === "true" ||
      consultantData.is_seven_academy === true;
  }

  if (consultantData.sevenAcademyTraining !== undefined) {
    try {
      updateData.seven_academy_training =
        typeof consultantData.sevenAcademyTraining === "string"
          ? JSON.parse(consultantData.sevenAcademyTraining)
          : consultantData.sevenAcademyTraining;
    } catch (e) {
      updateData.seven_academy_training = null;
    }
  }

  if (consultantData.isFavorite !== undefined || consultantData.is_favorite !== undefined) {
    updateData.is_favorite =
      consultantData.isFavorite === true ||
      consultantData.isFavorite === "true" ||
      consultantData.is_favorite === true;
  }

  if (consultantData.isBlacklisted !== undefined || consultantData.is_blacklisted !== undefined) {
    updateData.is_blacklisted =
      consultantData.isBlacklisted === true ||
      consultantData.isBlacklisted === "true" ||
      consultantData.is_blacklisted === true;
  }

  if (consultantData.blacklistReason !== undefined || consultantData.blacklist_reason !== undefined) {
    updateData.blacklist_reason = consultantData.blacklistReason || consultantData.blacklist_reason;
  }

  if (consultantData.blacklistDate !== undefined || consultantData.blacklist_date !== undefined) {
    updateData.blacklist_date = consultantData.blacklistDate || consultantData.blacklist_date || null;
  }

  if (consultantData.isExcluded !== undefined || consultantData.is_excluded !== undefined) {
    const excludedValue = consultantData.isExcluded !== undefined ? consultantData.isExcluded : consultantData.is_excluded;
    // FormData sends booleans as strings, so handle both
    updateData.is_excluded =
      excludedValue === true ||
      excludedValue === "true" ||
      String(excludedValue).toLowerCase() === 'true';
  }

  // Handle other_languages, test_results, quality_control
  if (consultantData.otherLanguages !== undefined || consultantData.other_languages !== undefined) {
    try {
      const otherLangs = consultantData.otherLanguages || consultantData.other_languages;
      if (typeof otherLangs === "string") {
        // Parse JSON string
        const parsed = JSON.parse(otherLangs);
        updateData.other_languages = Array.isArray(parsed) ? parsed : [];
      } else if (Array.isArray(otherLangs)) {
        // Already an array
        updateData.other_languages = otherLangs;
      } else {
        // Default to empty array
        updateData.other_languages = [];
      }
    } catch (e) {
      updateData.other_languages = [];
    }
  } else {
    // Always set other_languages, even if not provided (default to empty array)
    updateData.other_languages = [];
  }

  if (consultantData.testResults !== undefined || consultantData.test_results !== undefined) {
    try {
      const testRes = consultantData.testResults || consultantData.test_results;
      updateData.test_results = typeof testRes === "string" ? JSON.parse(testRes) : (testRes || []);
    } catch (e) {
      updateData.test_results = [];
    }
  }

  if (consultantData.qualityControl !== undefined || consultantData.quality_control !== undefined) {
    try {
      const qc = consultantData.qualityControl || consultantData.quality_control;
      updateData.quality_control = typeof qc === "string" ? JSON.parse(qc) : (qc || { references: [], clientFeedbacks: [] });
    } catch (e) {
      updateData.quality_control = { references: [], clientFeedbacks: [] };
    }
  }

  // Handle city, department, latitude, longitude - always include if defined (even if empty string)
  // FormData sends everything as strings, so we need to handle that
  if (consultantData.city !== undefined) {
    const cityValue = String(consultantData.city).trim();
    updateData.city = cityValue && cityValue !== '' && cityValue !== 'null' && cityValue !== 'undefined' ? cityValue : null;
  }
  if (consultantData.department !== undefined) {
    const deptValue = String(consultantData.department).trim();
    updateData.department = deptValue && deptValue !== '' && deptValue !== 'null' && deptValue !== 'undefined' && deptValue !== 'none' ? deptValue : null;
  }
  if (consultantData.latitude !== undefined) {
    const latStr = String(consultantData.latitude).trim();
    if (latStr && latStr !== '' && latStr !== 'null' && latStr !== 'undefined') {
      const lat = parseFloat(latStr);
      updateData.latitude = !isNaN(lat) ? lat : null;
    } else {
      updateData.latitude = null;
    }
  }
  if (consultantData.longitude !== undefined) {
    const lonStr = String(consultantData.longitude).trim();
    if (lonStr && lonStr !== '' && lonStr !== 'null' && lonStr !== 'undefined') {
      const lon = parseFloat(lonStr);
      updateData.longitude = !isNaN(lon) ? lon : null;
    } else {
      updateData.longitude = null;
    }
  }
  updateData.last_activity = new Date().toISOString();

  // Remove undefined values to avoid issues
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  const { data: updatedConsultant, error } = await supabaseAdmin
    .from("consultants")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Supabase update error:", error);
    console.error("Update data keys:", Object.keys(updateData));
    console.error("Error details:", JSON.stringify(error, null, 2));
    throw new ApiError(500, `Failed to update consultant: ${error.message || error.details || JSON.stringify(error)}`);
  }

  // Create notifications for assignment change
  if (
    updateData.commercial_id !== undefined &&
    existingConsultant.commercial_id !== updateData.commercial_id &&
    updateData.commercial_id
  ) {
    try {
      const io = req.app.get('io');
      await notificationService.addNotification({
        type: "assignment",
        message: `${currentUser.name} vous a assigné ${updatedConsultant.name}.`,
        entity_type: "consultant",
        entity_id: updatedConsultant.id,
        recipient_id: updateData.commercial_id,
      }, io);
    } catch (notifError) {
      console.error("Notification error:", notifError);
    }
  }

  // Create notification for availability change
  if (
    updateData.availability &&
    existingConsultant.availability?.status !== "available" &&
    updateData.availability.status === "available" &&
    updatedConsultant.commercial_id
  ) {
    try {
      const io = req.app.get('io');
      await notificationService.addNotification({
        type: "availability",
        message: `${updatedConsultant.name} est de nouveau disponible.`,
        entity_type: "consultant",
        entity_id: updatedConsultant.id,
        recipient_id: updatedConsultant.commercial_id,
      }, io);
    } catch (notifError) {
      console.error("Notification error:", notifError);
    }
  }

  // Emit Socket.IO event for real-time updates
  const io = req.app.get('io');
  if (io && updatedConsultant) {
    io.emit('consultant:updated', updatedConsultant);
  }

  res.status(200).json(new ApiResponse(200, updatedConsultant, "Consultant updated successfully"));
});

const deleteConsultant = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get consultant before deleting to emit socket event
  const { data: consultantToDelete } = await supabaseAdmin
    .from("consultants")
    .select("*")
    .eq("id", id)
    .single();

  const { error } = await supabaseAdmin.from("consultants").delete().eq("id", id);

  if (error) {
    throw new ApiError(500, `Failed to delete consultant: ${error.message}`);
  }

  // Emit Socket.IO event for real-time updates
  const io = req.app.get('io');
  if (io && consultantToDelete) {
    io.emit('consultant:deleted', { id: id, ...consultantToDelete });
  }

  res.status(200).json(new ApiResponse(200, {}, "Consultant deleted successfully"));
});

const searchConsultants = asyncHandler(async (req, res) => {
  const {
    search,
    tags,
    filterType,
    experienceMin,
    experienceMax,
    commercialId,
    availability,
    priceMin,
    priceMax,
    englishLevel,
    nationality,
    isPermifier,
    isRelocatable,
  } = req.query;

  let query = supabaseAdmin.from("consultants").select("*");

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,role.ilike.%${search}%,company.ilike.%${search}%`);
  }

  if (tags) {
    const tagArray = Array.isArray(tags) ? tags : tags.split(",");
    query = query.contains("tags", tagArray);
  }

  if (filterType) {
    switch (filterType) {
      case "favorites":
        query = query.eq("is_favorite", true);
        break;
      case "blacklist":
        query = query.eq("is_blacklisted", true);
        break;
      case "followup":
        query = query.not("next_followup", "is", null).lte("next_followup", new Date().toISOString());
        break;
      case "my_consultants":
        query = query.eq("commercial_id", req.user.id);
        break;
      case "available":
        query = query.or(
          `availability->>status.eq.available,availability->>status.eq.next_month,availability->>status.eq.custom`
        );
        break;
    }
  }

  if (experienceMin !== undefined) {
    query = query.gte("years_of_experience", parseInt(experienceMin));
  }

  if (experienceMax !== undefined) {
    query = query.lte("years_of_experience", parseInt(experienceMax));
  }

  if (commercialId && commercialId !== "all") {
    query = query.eq("commercial_id", commercialId);
  }

  if (availability && availability !== "all") {
    query = query.eq("availability->>status", availability);
  }

  if (priceMin !== undefined) {
    query = query.gte("price", parseFloat(priceMin));
  }

  if (priceMax !== undefined) {
    query = query.lte("price", parseFloat(priceMax));
  }

  if (englishLevel && englishLevel !== "all") {
    query = query.eq("english_level", englishLevel);
  }

  if (nationality && nationality !== "all") {
    query = query.eq("nationality", nationality);
  }

  if (isPermifier === "true") {
    query = query.eq("is_permifier", true);
  }

  if (isRelocatable === "true") {
    query = query.eq("is_relocatable", true);
  }

  query = query.order("created_at", { ascending: false });

  const { data: consultants, error } = await query;

  if (error) {
    throw new ApiError(500, "Failed to search consultants");
  }

  res.status(200).json(new ApiResponse(200, consultants || [], "Consultants fetched successfully"));
});

export {
  getAllConsultants,
  getConsultantById,
  createConsultant,
  updateConsultant,
  deleteConsultant,
  searchConsultants,
};


