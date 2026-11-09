import usePackJob from './usePackJob';

export default function useBedrockJob(token, username) {
  const result = usePackJob(token, username, 'bedrock');
  return { ...result, start: (file, fields) => result.start(file, { ...fields, targetFormat: '999' }) };
}
