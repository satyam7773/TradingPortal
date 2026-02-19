import React, { useState } from 'react'
import { InputField, DropdownField, ButtonField, DropdownOption } from '../../shared/components/forms'

const ComponentShowcase: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | number | null>(null)
  const [loading, setLoading] = useState(false)

  const demoOptions: DropdownOption[] = [
    { label: 'Option 1', value: '1', icon: 'pi pi-star' },
    { label: 'Option 2', value: '2', icon: 'pi pi-heart' },
    { label: 'Option 3', value: '3', icon: 'pi pi-bolt' },
    { label: 'Disabled Option', value: '4', icon: 'pi pi-ban', disabled: true },
  ]

  const handleSubmit = async () => {
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-bg-primary p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            PrimeReact Components Showcase
          </h1>
          <p className="text-text-secondary">
            Beautiful, theme-aware components for your trading application
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Input Fields Section */}
          <div className="bg-surface-primary p-8 rounded-2xl border border-border-primary">
            <h2 className="text-2xl font-bold text-text-primary mb-6">Input Fields</h2>
            
            <div className="space-y-6">
              <InputField
                label="Email Input"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="Enter your email"
                icon="pi pi-envelope"
                helpText="This is a helpful hint"
              />

              <InputField
                label="Password Input"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Enter password"
                showPasswordStrength={true}
                helpText="Password strength indicator enabled"
              />

              <InputField
                label="Required Input"
                value=""
                onChange={() => {}}
                placeholder="This field is required"
                required
                error="This field is required"
              />

              <InputField
                label="Disabled Input"
                value="Disabled value"
                onChange={() => {}}
                disabled
                helpText="This input is disabled"
              />
            </div>
          </div>

          {/* Dropdown Section */}
          <div className="bg-surface-primary p-8 rounded-2xl border border-border-primary">
            <h2 className="text-2xl font-bold text-text-primary mb-6">Dropdown Fields</h2>
            
            <div className="space-y-6">
              <DropdownField
                label="Basic Dropdown"
                value={selectedOption}
                onChange={setSelectedOption}
                options={demoOptions}
                placeholder="Select an option"
                helpText="Choose from the available options"
              />

              <DropdownField
                label="Filterable Dropdown"
                value={null}
                onChange={() => {}}
                options={demoOptions}
                placeholder="Search options..."
                filter={true}
                filterPlaceholder="Type to search..."
                helpText="You can search through options"
              />

              <DropdownField
                label="Required Dropdown"
                value={null}
                onChange={() => {}}
                options={demoOptions}
                placeholder="Select required option"
                required
                error="Please select an option"
              />

              <DropdownField
                label="Loading Dropdown"
                value={null}
                onChange={() => {}}
                options={[]}
                placeholder="Loading..."
                loading={true}
                helpText="Dropdown in loading state"
              />
            </div>
          </div>

          {/* Buttons Section */}
          <div className="bg-surface-primary p-8 rounded-2xl border border-border-primary lg:col-span-2">
            <h2 className="text-2xl font-bold text-text-primary mb-6">Button Variants</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-text-secondary">Primary Buttons</h3>
                <ButtonField label="Primary" variant="primary" />
                <ButtonField label="Success" variant="success" />
                <ButtonField label="Warning" variant="warning" />
                <ButtonField label="Danger" variant="danger" />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-text-secondary">With Icons</h3>
                <ButtonField label="Login" icon="pi pi-sign-in" variant="primary" />
                <ButtonField label="Download" icon="pi pi-download" variant="success" />
                <ButtonField label="Settings" icon="pi pi-cog" variant="secondary" />
                <ButtonField label="Delete" icon="pi pi-trash" variant="danger" />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-text-secondary">States & Sizes</h3>
                <ButtonField label="Loading" loading={loading} onClick={handleSubmit} />
                <ButtonField label="Disabled" disabled />
                <ButtonField label="Small" size="small" variant="outlined" />
                <ButtonField label="Large" size="large" variant="primary" />
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-text-secondary">Full Width & Special</h3>
              <ButtonField 
                label="Full Width Primary" 
                variant="primary" 
                fullWidth 
                icon="pi pi-check"
                size="large"
              />
              <div className="flex gap-4">
                <ButtonField label="Outlined" variant="outlined" />
                <ButtonField label="Text Button" variant="text" />
                <ButtonField label="Link Button" variant="link" />
              </div>
            </div>
          </div>
        </div>

        {/* Demo Form */}
        <div className="mt-12 bg-surface-primary p-8 rounded-2xl border border-border-primary">
          <h2 className="text-2xl font-bold text-text-primary mb-6">Complete Form Example</h2>
          
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                label="First Name"
                value=""
                onChange={() => {}}
                placeholder="Enter first name"
                required
              />
              <InputField
                label="Last Name"
                value=""
                onChange={() => {}}
                placeholder="Enter last name"
                required
              />
            </div>

            <InputField
              label="Email Address"
              type="email"
              value=""
              onChange={() => {}}
              placeholder="Enter email address"
              icon="pi pi-envelope"
              required
            />

            <DropdownField
              label="Country"
              value={null}
              onChange={() => {}}
              options={[
                { label: 'United States', value: 'us', icon: 'pi pi-flag' },
                { label: 'United Kingdom', value: 'uk', icon: 'pi pi-flag' },
                { label: 'Canada', value: 'ca', icon: 'pi pi-flag' },
              ]}
              placeholder="Select your country"
              filter={true}
              required
            />

            <div className="flex gap-4 pt-4">
              <ButtonField
                label="Submit Form"
                type="submit"
                variant="primary"
                icon="pi pi-check"
                size="large"
              />
              <ButtonField
                label="Reset"
                type="reset"
                variant="outlined"
                icon="pi pi-refresh"
                size="large"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ComponentShowcase