import express from "express";
import * as blogController from "../../controllers/blogController.js";
import { verifyAccessToken } from "../../middlewares/auth.js";
import { validateParams, validateBody, validateQuery } from "../../middlewares/validateRequest.js";
import {
    createBlogSchema,
    updateBlogSchema,
    updateBlogStatusSchema,
    blogIdParams,
    blogSlugParams,
    blogCategoryParams,
    blogStatusParams,
    getBlogsQuery,
} from "../../validations/blog.schema.js";
import { userIdParams } from "../../validations/common.schema.js";

const router = express.Router();

// Base route: /api/expert/:userId/blogs
router.post(
    "/:userId/blogs",
    validateParams(userIdParams),
    validateBody(createBlogSchema),
    verifyAccessToken,
    blogController.createBlog
);

router.get(
    "/:userId/blogs",
    validateParams(userIdParams),
    validateQuery(getBlogsQuery),
    blogController.getBlogs
);

router.get(
    "/:userId/blogs/:blogId",
    validateParams(blogIdParams),
    blogController.getBlogById
);

router.put(
    "/:userId/blogs/:blogId",
    validateParams(blogIdParams),
    validateBody(updateBlogSchema),
    verifyAccessToken,
    blogController.updateBlog
);

router.delete(
    "/:userId/blogs/:blogId",
    validateParams(blogIdParams),
    verifyAccessToken,
    blogController.deleteBlog
);

router.patch(
    "/:userId/blogs/:blogId/status",
    validateParams(blogIdParams),
    validateBody(updateBlogStatusSchema),
    verifyAccessToken,
    blogController.patchBlogStatus
);

router.get(
    "/:userId/blogs/stats",
    validateParams(userIdParams),
    blogController.getBlogStatistics
);

router.get(
    "/:userId/blogs/status/:status",
    validateParams(blogStatusParams),
    blogController.GetBlogByStatus
);

router.get(
    "/:userId/blogs/category/:category",
    validateParams(blogCategoryParams),
    blogController.GetBlogByCategory
);

router.get(
    "/:userId/blogs/slug/:slug",
    validateParams(blogSlugParams),
    blogController.getBlogBySlug
);

router.delete(
    "/:userId/blogs/slug/:slug",
    validateParams(blogSlugParams),
    verifyAccessToken,
    blogController.deleteBlogBySlug
);

export default router;

