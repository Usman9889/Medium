import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { decode, sign, verify } from "hono/jwt";
import { createBlogInput, updateBlogInput } from "@usman9889/common";

export const blogRouter = new Hono<{
      Bindings: {
        DATABASE_URL: string,
        JWT_SECRET: string
      },
      Variables: {
            userId: string
      }
}>();

//Get the header and verify the token
blogRouter.use('/*', async (c, next) => {
      const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL,
	}).$extends(withAccelerate());

	const jwt = c.req.header('Authorization');
	if (!jwt) {
		c.status(401);
		return c.json({ error: "unauthorized" });
	}
	const token = jwt.split(' ')[1];
	const payload = await verify(token, c.env.JWT_SECRET);
	if (!payload) {
		c.status(401);
		return c.json({ error: "unauthorized" });
	}
      // @ts-ignore
	c.set('userId', payload.id);
	await next()
})

//create a blog
blogRouter.post('/blog', async (c) => {
	const userId = c.get('userId');
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());

	const body = await c.req.json();
	const {success} = createBlogInput.safeParse(body);
	if(!success){
		c.status(400);
		return c.json({
			error: "Invalid Input"
		})
	}
	const post = await prisma.post.create({
		data: {
			title: body.title,
			content: body.content,
			authorId: userId,
			//@ts-ignore
			// authorName: author?.name || author?.email || 'Anonymous'
		}
	});
	return c.json({
		id: post.id
	});
})

//Update the blog
blogRouter.put('/blog', async (c) => {
	const userId = c.get('userId');
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());

	const body = await c.req.json();
	const {success} = updateBlogInput.safeParse(body);
	if(!success){
		c.status(400)
	}
	const post = await prisma.post.update({
		where: {
			id: body.id,
			authorId: userId
		},
		data: {
			title: body.title,
			content: body.content,
		}
	});

	return c.json({id: post.id});
});

//Get blog by ID
blogRouter.get('/blog/:id', async (c) => {
	const id = c.req.param('id');
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());
	
	const blog = await prisma.post.findFirst({
		where: {
			id
		},
		select: {
			id: true, 
			title: true,
			content: true,
			createdAt: true,
			author: {
				select: {
					name: true
				}
			}
		}
	});
	if(!blog){
		return c.json({error: "blog not found"})
	}

	return c.json({blog});
})

//Get all the blogs
blogRouter.get('/bulk', async (c) => {
	const prisma = new PrismaClient({
	  datasourceUrl: c.env?.DATABASE_URL,
	}).$extends(withAccelerate());
    
	try {
	  const blogs = await prisma.post.findMany({
	    orderBy: {
		createdAt: 'desc'
	    },
	    select: {
		id: true,
		title: true,
		content: true,
		createdAt: true,
		author:{
			select:{
				name: true
			}
		}
	    }
	  });
	  c.status(200)
	  return c.json({ blogs });
    
	} catch (error) {
	  c.status(403)
	  return c.json({ message: 'Error fetching blogs' });
	}
    });
// blogRouter.get('/bulk', async (c) => {
// 	// const prisma = new PrismaClient({
// 	// 	datasourceUrl: c.env?.DATABASE_URL	,
// 	// }).$extends(withAccelerate());
	
// 	// const posts = await prisma.post.findMany();

// 	return c.json( "usman");
// })

// blogRouter.get('/bulk', async (c) => {
// 	const prisma = new PrismaClient({
// 	  datasourceUrl: c.env?.DATABASE_URL,
// 	}).$extends(withAccelerate());
    
// 	try {
// 	  const blogs = await prisma.post.findMany();
// 	  console.log('Fetched Blogs:', blogs); // Debug log
    
// 	  if (!blogs || blogs.length === 0) {
// 	    return c.json({ message: 'No posts found', blogs: [] });
// 	  }
    
// 	  return c.json({ blogs });
    
// 	} catch (error) {
// 	  console.error('Error fetching blogs:', error);
// 	  return c.json({ message: 'Error fetching blogs' });
// 	}
//     });
    
    