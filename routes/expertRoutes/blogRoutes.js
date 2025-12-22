import express from "express";
import * as blogController from "../../controllers/blogController.js";
import { verifyAccessToken } from "../../middlewares/auth.js";

const router = express.Router();

// Base route: /api/expert/:userId/blogs
router.post("/:userId/blogs", verifyAccessToken, blogController.createBlog);
router.get("/:userId/blogs", blogController.getBlogs);
router.get("/:userId/blogs/:blogId", blogController.getBlogById);
router.put("/:userId/blogs/:blogId", verifyAccessToken, blogController.updateBlog);
router.delete("/:userId/blogs/:blogId", verifyAccessToken, blogController.deleteBlog);

router.patch("/:userId/blogs/:blogId/status", verifyAccessToken, blogController.patchBlogStatus)
router.get("/:userId/blogs/stats", blogController.getBlogStatistics)
router.get("/:userId/blogs/status/:status", blogController.GetBlogByStatus)
router.get("/:userId/blogs/category/:category", blogController.GetBlogByCategory)
router.get("/:userId/blogs/slug/:slug", blogController.getBlogBySlug)
router.delete("/:userId/blogs/slug/:slug", verifyAccessToken, blogController.deleteBlogBySlug);

export default router;
