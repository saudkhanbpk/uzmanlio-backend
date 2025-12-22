import Blog from "../models/Blog.js";
import User from "../models/expertInformation.js";
import mongoose from "mongoose";
import xss from "xss";

// Helper function to find user by ID
const findUserById = async (userId) => {
  let user;

  // Try to find by MongoDB ObjectId first
  if (mongoose.Types.ObjectId.isValid(userId)) {
    user = await User.findById(userId);
  }

  // If not found or invalid ObjectId, try to find by custom ID field
  if (!user) {
    user = await User.findOne({
      $or: [
        { _id: userId },
        { id: userId },
        { userId: userId },
        { customId: userId }
      ]
    });
  }

  if (!user) {
    throw new Error('User not found');
  }
  return user;
};
// Create a new blog
export const createBlog = async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const blogData = req.body;

    const generateSlug = (title) =>
      title
        .toLowerCase()
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/ı/g, "i")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");

    const slug = generateSlug(blogData.title);

    const slugExists = await Blog.findOne({ slug });
    if (slugExists) {
      return res.status(400).json({ error: "Slug already exists" });
    }

    const blog = await Blog.create({
      user: user._id,
      title: xss(blogData.title),
      content: xss(blogData.content),
      category: blogData.category,
      keywords: blogData.keywords || [],
      status: blogData.status || "draft",
      slug,
      author: xss(blogData.author || user.information?.name || "Uzman")
    });

    user.blogs.push(blog._id);
    await user.save();

    res.status(201).json({
      blog,
      message: "Blog successfully created"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const getBlogs = async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    const blogs = await Blog.find({ user: user._id })
      .sort({ createdAt: -1 });

    res.json({ blogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Delete a blog
export const deleteBlog = async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    const blog = await Blog.findOneAndDelete({
      _id: req.params.blogId,
      user: user._id
    });

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    await User.updateOne(
      { _id: user._id },
      { $pull: { blogs: blog._id } }
    );

    res.json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const getBlogById = async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    const blog = await Blog.findOne({
      _id: req.params.blogId,
      user: user._id
    });

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.json({ blog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a blog
export const updateBlog = async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const blogData = req.body;

    const generateSlug = (title) =>
      title
        .toLowerCase()
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/ı/g, "i")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");

    const updateData = {
      title: blogData.title ? xss(blogData.title) : undefined,
      content: blogData.content ? xss(blogData.content) : undefined,
      category: blogData.category,
      keywords: blogData.keywords,
      status: blogData.status,
      author: blogData.author ? xss(blogData.author) : undefined
    };

    if (blogData.title) {
      const slug = generateSlug(blogData.title);

      const slugExists = await Blog.findOne({
        slug,
        _id: { $ne: req.params.blogId }
      });

      if (slugExists) {
        return res.status(400).json({ error: "Slug already exists" });
      }

      updateData.slug = slug;
    }

    const blog = await Blog.findOneAndUpdate(
      { _id: req.params.blogId, user: user._id },
      updateData,
      { new: true }
    );

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.json({
      blog,
      message: "Blog successfully updated"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a blog by slug
export const deleteBlogBySlug = async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    const blog = await Blog.findOneAndDelete({
      slug: req.params.slug,
      user: user._id
    });

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    await User.updateOne(
      { _id: user._id },
      { $pull: { blogs: blog._id } }
    );

    res.json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Update blog status (publish/unpublish)
export const patchBlogStatus = async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const { status } = req.body;

    if (!["draft", "published"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const blog = await Blog.findOneAndUpdate(
      { _id: req.params.blogId, user: user._id },
      { status },
      { new: true }
    );

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.json({
      blog,
      message: "Blog status updated"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get blog statistics
export const getBlogStatistics = async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    const blogs = await Blog.find({ user: user._id });

    const stats = {
      total: blogs.length,
      published: blogs.filter(b => b.status === "published").length,
      draft: blogs.filter(b => b.status === "draft").length,
      categories: [...new Set(blogs.map(b => b.category))].map(cat => ({
        name: cat,
        count: blogs.filter(b => b.category === cat).length
      }))
    };

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get blog by slug (for public view)
export const getBlogBySlug = async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug })
      .populate("user", "information.name");

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.json({ blog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Get blogs by category (user specific)
export const GetBlogByCategory = async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const { category } = req.params;

    const blogs = await Blog.find({
      user: user._id,
      category
    }).sort({ createdAt: -1 });

    res.json({ blogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get blogs by status (user specific)
export const GetBlogByStatus = async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const { status } = req.params;

    if (!["draft", "published"].includes(status)) {
      return res.status(400).json({ error: "Invalid blog status" });
    }

    const blogs = await Blog.find({
      user: user._id,
      status
    }).sort({ createdAt: -1 });

    res.json({ blogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
