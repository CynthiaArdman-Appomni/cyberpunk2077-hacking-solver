import runSolver from '../lib/bruter';

function postAction(action: string, payload?: any) {
  return postMessage({ action, payload });
}

// Pre-load the solver by importing runSolver above
postAction('load_success');

self.onmessage = function(e) {
  const { action, payload } = e.data;
  if (action === 'solve') {
    try {
      const { matrix, sequences, bufferSize, options } = payload;
      const result = runSolver(matrix, sequences, bufferSize, options || {});
      postAction('solve_success', result);
    } catch (err) {
      postAction('solve_error', err);
    }
  }
};

export default {};
