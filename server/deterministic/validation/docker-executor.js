async function executeInDocker({ fileId, file, language }) {
  const content = file && file.content || '';
  if (!content.trim()) {
    return {
      fileId,
      success: false,
      output: '',
      stderr: 'Empty file',
      reason: 'compile_error',
      language
    };
  }

  const sabotageTimeout = /while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;|sleep\s*\(\s*999/i.test(content);
  if (sabotageTimeout) {
    return {
      fileId,
      success: false,
      output: '',
      stderr: 'Execution timed out',
      reason: 'timeout',
      language
    };
  }

  return {
    fileId,
    success: true,
    output: file && file.simulatedOutput ? String(file.simulatedOutput) : 'OK',
    stderr: '',
    reason: 'passed',
    language,
    executor: 'docker-stub'
  };
}

module.exports = {
  executeInDocker
};