module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'api-gateway',
        'gps-tracking',
        'emergency-alerts',
        'student-presence',
        'video-service',
        'student-management',
        'compliance-management',
        'admin-dashboard',
        'driver-app',
        'parent-app',
        'infra',
        'docs',
        'deps',
        'ci',
      ],
    ],
    'scope-empty': [1, 'never'],
    'subject-full-stop': [0, 'never'],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'revert'],
    ],
  },
};

