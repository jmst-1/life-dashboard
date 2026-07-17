'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CATEGORY_TEMPLATES,
  CUSTOM_CATEGORY_DEFAULTS,
  type CategoryTemplateId,
} from '@/lib/category-templates';
import { categoryFormValuesFromDefaults } from '@/lib/category-form-values';
import { CategoryForm } from './category-form';
import { CategoryGlyph } from './category-glyph';

type AddCategoryFlowProps = {
  allowCustomCategories: boolean;
  open: boolean;
  onClose: () => void;
};

type FlowStep = 'pick' | 'form';

export function AddCategoryFlow({
  allowCustomCategories,
  open,
  onClose,
}: AddCategoryFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>('pick');
  const [templateId, setTemplateId] = useState<CategoryTemplateId | null>(
    null
  );
  const [isCustom, setIsCustom] = useState(false);

  if (!open) return null;

  function handleClose() {
    setStep('pick');
    setTemplateId(null);
    setIsCustom(false);
    onClose();
  }

  function selectTemplate(id: CategoryTemplateId) {
    setTemplateId(id);
    setIsCustom(false);
    setStep('form');
  }

  function selectCustom() {
    setTemplateId('custom');
    setIsCustom(true);
    setStep('form');
  }

  function handleSuccess() {
    handleClose();
    router.refresh();
  }

  const selectedTemplate = CATEGORY_TEMPLATES.find((t) => t.id === templateId);
  const formDefaults = isCustom
    ? CUSTOM_CATEGORY_DEFAULTS
    : (selectedTemplate?.defaults ?? CUSTOM_CATEGORY_DEFAULTS);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-category-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded border border-gray-700 bg-gray-950 p-6 text-white shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 id="add-category-title" className="text-lg font-semibold">
            {step === 'pick' ? 'Add category' : 'Category details'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-sm text-gray-400 hover:text-white"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        {step === 'pick' && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-gray-400">
              Start from a template
              {allowCustomCategories ? ', or build your own.' : '.'}
            </p>

            {CATEGORY_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => selectTemplate(template.id)}
                className="flex w-full items-start gap-3 rounded border border-gray-700 bg-gray-900 p-4 text-left hover:border-gray-500"
              >
                <CategoryGlyph
                  icon={template.defaults.icon}
                  color={template.defaults.color}
                  size={24}
                />
                <span>
                  <span className="block text-sm font-medium text-white">
                    {template.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-400">
                    {template.description}
                  </span>
                </span>
              </button>
            ))}

            {allowCustomCategories && (
              <button
                type="button"
                onClick={selectCustom}
                className="flex w-full items-start gap-3 rounded border border-dashed border-gray-600 bg-gray-900/50 p-4 text-left hover:border-gray-400"
              >
                <CategoryGlyph
                  icon="clipboard-list"
                  color="#94a3b8"
                  size={24}
                />
                <span>
                  <span className="block text-sm font-medium text-white">
                    Build your own
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-400">
                    Custom AI-coached category with your own brief
                  </span>
                </span>
              </button>
            )}
          </div>
        )}

        {step === 'form' && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                setStep('pick');
                setTemplateId(null);
                setIsCustom(false);
              }}
              className="mb-4 text-sm text-gray-400 underline hover:text-white"
            >
              Back to templates
            </button>
            <CategoryForm
              mode="create"
              initialValues={categoryFormValuesFromDefaults(formDefaults)}
              templateId={templateId}
              isCustom={isCustom}
              onCancel={handleClose}
              onSuccess={handleSuccess}
            />
          </div>
        )}
      </div>
    </div>
  );
}
