import { z } from 'zod';

export const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.parse(req.body);
      req.validatedData = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      res.status(400).json({ error: 'Validation error' });
    }
  };
};