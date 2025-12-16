import express from "express";
import * as blogController from "../../controllers/blogController.js";

const router = express.Router();

// Base route: /api/expert/:userId/blogs
router.post("/:userId/blogs", blogController.createBlog);
router.get("/:userId/blogs", blogController.getBlogs);
router.get("/:userId/blogs/:blogId", blogController.getBlogById);
router.put("/:userId/blogs/:blogId", blogController.updateBlog);
router.delete("/:userId/blogs/:blogId", blogController.deleteBlog);

router.patch("/:userId/blogs/:blogId/status", blogController.patchBlogStatus)
router.get("/:userId/blogs/stats", blogController.getBlogStatistics)
router.get("/:userId/blogs/status/:status", blogController.GetBlogByStatus)
router.get("/:userId/blogs/category/:category", blogController.GetBlogByCategory)
router.get("/:userId/blogs/slug/:slug", blogController.getBlogBySlug)
router.delete("/:userId/blogs/slug/:slug", blogController.deleteBlogBySlug);

export default router;
