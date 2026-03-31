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
  },
};
