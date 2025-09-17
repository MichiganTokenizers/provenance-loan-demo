import { useState } from 'react'
import { 
  UserIcon, 
  CogIcon, 
  ShieldCheckIcon, 
  BellIcon,
  KeyIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const [settings, setSettings] = useState({
    profile: {
      name: 'Michigan Tokenizers',
      email: 'admin@michigantokenizers.com',
      phone: '(555) 123-4567',
      organization: 'Michigan Tokenizers LLC',
      role: 'Administrator'
    },
    notifications: {
      emailNotifications: true,
      paymentAlerts: true,
      loanStatusUpdates: true,
      systemMaintenance: false,
      marketingEmails: false
    },
    security: {
      twoFactorAuth: true,
      sessionTimeout: 30,
      passwordExpiry: 90,
      loginAlerts: true
    },
    blockchain: {
      network: 'testnet',
      autoConfirmTransactions: false,
      gasPriceMultiplier: 1.2,
      maxGasPrice: 50
    }
  })

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'blockchain', name: 'Blockchain', icon: KeyIcon },
    { id: 'system', name: 'System', icon: CogIcon }
  ]

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }))
  }

  const handleSave = () => {
    // Simulate API call
    console.log('Saving settings:', settings)
    // Show success message
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <tab.icon className="mr-3 h-5 w-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="card p-6">
            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Profile Information</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Update your personal information and contact details
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="label">Full Name</label>
                    <input
                      type="text"
                      value={settings.profile.name}
                      onChange={(e) => handleSettingChange('profile', 'name', e.target.value)}
                      className="input mt-1"
                    />
                  </div>

                  <div>
                    <label className="label">Email Address</label>
                    <input
                      type="email"
                      value={settings.profile.email}
                      onChange={(e) => handleSettingChange('profile', 'email', e.target.value)}
                      className="input mt-1"
                    />
                  </div>

                  <div>
                    <label className="label">Phone Number</label>
                    <input
                      type="tel"
                      value={settings.profile.phone}
                      onChange={(e) => handleSettingChange('profile', 'phone', e.target.value)}
                      className="input mt-1"
                    />
                  </div>

                  <div>
                    <label className="label">Organization</label>
                    <input
                      type="text"
                      value={settings.profile.organization}
                      onChange={(e) => handleSettingChange('profile', 'organization', e.target.value)}
                      className="input mt-1"
                    />
                  </div>

                  <div>
                    <label className="label">Role</label>
                    <input
                      type="text"
                      value={settings.profile.role}
                      disabled
                      className="input mt-1 bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Notification Preferences</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose how you want to be notified about important events
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                      <p className="text-sm text-gray-500">Receive notifications via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.emailNotifications}
                        onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Payment Alerts</h3>
                      <p className="text-sm text-gray-500">Get notified about payment status changes</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.paymentAlerts}
                        onChange={(e) => handleSettingChange('notifications', 'paymentAlerts', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Loan Status Updates</h3>
                      <p className="text-sm text-gray-500">Receive updates when loan status changes</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.loanStatusUpdates}
                        onChange={(e) => handleSettingChange('notifications', 'loanStatusUpdates', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">System Maintenance</h3>
                      <p className="text-sm text-gray-500">Get notified about scheduled maintenance</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.systemMaintenance}
                        onChange={(e) => handleSettingChange('notifications', 'systemMaintenance', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Marketing Emails</h3>
                      <p className="text-sm text-gray-500">Receive promotional content and updates</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.marketingEmails}
                        onChange={(e) => handleSettingChange('notifications', 'marketingEmails', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Security Settings</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Manage your account security and authentication preferences
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h3>
                      <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.security.twoFactorAuth}
                        onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="label">Session Timeout (minutes)</label>
                    <select
                      value={settings.security.sessionTimeout}
                      onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                      className="input mt-1"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                      <option value={480}>8 hours</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Password Expiry (days)</label>
                    <select
                      value={settings.security.passwordExpiry}
                      onChange={(e) => handleSettingChange('security', 'passwordExpiry', parseInt(e.target.value))}
                      className="input mt-1"
                    >
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                      <option value={90}>90 days</option>
                      <option value={180}>180 days</option>
                      <option value={365}>1 year</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Login Alerts</h3>
                      <p className="text-sm text-gray-500">Get notified about new login attempts</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.security.loginAlerts}
                        onChange={(e) => handleSettingChange('security', 'loginAlerts', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Blockchain Settings */}
            {activeTab === 'blockchain' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Blockchain Configuration</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Configure your Provenance blockchain connection settings
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="label">Network</label>
                    <select
                      value={settings.blockchain.network}
                      onChange={(e) => handleSettingChange('blockchain', 'network', e.target.value)}
                      className="input mt-1"
                    >
                      <option value="testnet">Testnet</option>
                      <option value="mainnet">Mainnet</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Auto-confirm Transactions</h3>
                      <p className="text-sm text-gray-500">Automatically confirm blockchain transactions</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.blockchain.autoConfirmTransactions}
                        onChange={(e) => handleSettingChange('blockchain', 'autoConfirmTransactions', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="label">Gas Price Multiplier</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={settings.blockchain.gasPriceMultiplier}
                      onChange={(e) => handleSettingChange('blockchain', 'gasPriceMultiplier', parseFloat(e.target.value))}
                      className="input mt-1"
                    />
                    <p className="mt-1 text-sm text-gray-500">Multiplier for gas price estimation</p>
                  </div>

                  <div>
                    <label className="label">Max Gas Price (Gwei)</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={settings.blockchain.maxGasPrice}
                      onChange={(e) => handleSettingChange('blockchain', 'maxGasPrice', parseInt(e.target.value))}
                      className="input mt-1"
                    />
                    <p className="mt-1 text-sm text-gray-500">Maximum gas price you're willing to pay</p>
                  </div>
                </div>
              </div>
            )}

            {/* System Settings */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">System Information</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    View system status and configuration details
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Application Version</dt>
                      <dd className="text-sm text-gray-900">v1.0.0</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                      <dd className="text-sm text-gray-900">January 15, 2024</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Database Status</dt>
                      <dd className="text-sm text-green-600">Connected</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Blockchain Status</dt>
                      <dd className="text-sm text-green-600">Connected</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">API Status</dt>
                      <dd className="text-sm text-green-600">Operational</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Uptime</dt>
                      <dd className="text-sm text-gray-900">99.9%</dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSave}
                className="btn btn-primary px-6 py-2"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
