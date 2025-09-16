# Environment Variables Setup

## API Configuration

To configure the API base URL, create a `.env` file in the root directory with:

```bash
VITE_API_BASE_URL=https://simfabdev-d6add0a229a7.herokuapp.com/api
```

## Default Values

If no environment variable is set, the application will default to:
- Production: `https://simfabdev-d6add0a229a7.herokuapp.com/api`
- Development: You can override this by setting `VITE_API_BASE_URL` in your `.env` file

## Local Development

For local development with a local server, you can set:
```bash
VITE_API_BASE_URL=http://localhost:3001/api
```

## Important Notes

- Environment variables in Vite must be prefixed with `VITE_` to be accessible in the frontend
- The `.env` file should be added to `.gitignore` if it contains sensitive information
- For production deployments, set the environment variable in your deployment platform
