'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  findFirstInvalidListingStep,
  validateListingWizardStep,
  type ListingStepValidation,
  type ListingStepValidationInput,
} from '@/lib/listings/listingSubmissionRules';
import { WIZARD_STEPS } from '@/lib/listings/ownerPropertyForm';

type UseOwnerPropertyWizardOptions = {
  validationInput: ListingStepValidationInput;
  clearFeedback: () => void;
  setError: (message: string) => void;
  onStepChanged?: () => void;
};

export default function useOwnerPropertyWizard({
  validationInput,
  clearFeedback,
  setError,
  onStepChanged,
}: UseOwnerPropertyWizardOptions) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [showValidation, setShowValidation] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);

  const activeStep = WIZARD_STEPS[activeStepIndex];
  const stepValidations = useMemo(
    () => WIZARD_STEPS.map((step) => validateListingWizardStep(step.id, validationInput)),
    [validationInput],
  );
  const currentStepValidation = stepValidations[activeStepIndex];
  const stepCompletion = useMemo(
    () => stepValidations.map((validation) => !validation.error),
    [stepValidations],
  );

  const showStepError = useCallback((validation: ListingStepValidation) => {
    setShowValidation(true);
    setValidationAttempt((previous) => previous + 1);
    setError(validation.error || 'Verifică informațiile introduse.');
  }, [setError]);

  const moveToStep = useCallback((nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(WIZARD_STEPS.length - 1, nextIndex));
    clearFeedback();
    setShowValidation(false);
    setActiveStepIndex(boundedIndex);
    onStepChanged?.();
  }, [clearFeedback, onStepChanged]);

  const continueToNextStep = useCallback(() => {
    clearFeedback();
    if (currentStepValidation.error) {
      showStepError(currentStepValidation);
      return false;
    }
    moveToStep(activeStepIndex + 1);
    return true;
  }, [activeStepIndex, clearFeedback, currentStepValidation, moveToStep, showStepError]);

  const findFirstInvalidStep = useCallback(() => {
    const firstInvalid = findFirstInvalidListingStep(validationInput);
    if (!firstInvalid) return null;
    const stepIndex = WIZARD_STEPS.findIndex((step) => step.id === firstInvalid.step);
    if (stepIndex !== activeStepIndex) moveToStep(stepIndex);
    showStepError(firstInvalid.validation);
    return firstInvalid;
  }, [activeStepIndex, moveToStep, showStepError, validationInput]);

  return {
    activeStep,
    activeStepIndex,
    stepCompletion,
    showValidation,
    validationAttempt,
    currentStepValidation,
    moveToStep,
    continueToNextStep,
    selectStep: moveToStep,
    findFirstInvalidStep,
  };
}
