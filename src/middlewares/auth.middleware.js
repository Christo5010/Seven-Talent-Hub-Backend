import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { supabase, supabaseAdmin } from "../utils/supabaseClient.js";

const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    // Validate Supabase access token and get user id
    const { data: authUser, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authUser?.user?.id) {
      throw new ApiError(401, "Invalid Access Token");
    }

    // Get profile from database
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, role, active, client_id, phone, address, bio, created_at, updated_at, username')
      .eq('id', authUser.user.id)
      .single();

    if (error || !user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    if (!user.active) {
      throw new ApiError(403, "Account is deactivated");
    }

    req.user = {
      ...user,
      role: user.role?.toLowerCase()
    };
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});

export { verifyJWT };
