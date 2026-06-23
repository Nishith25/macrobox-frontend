// frontend/src/components/account/AddressFormDrawer.tsx (FRONTEND)

import {
  type Dispatch,
  type KeyboardEvent,
  type Ref,
  type SetStateAction,
} from "react";
import {
  Check,
  Loader2,
  MapPin,
  Navigation,
  Search,
  X,
} from "lucide-react";

export type AddressFormValue = {
  fullName: string;
  phone: string;
  flatNo: string;
  floor: string;
  buildingName: string;
  area: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  addressLabel: "Home" | "Work" | "Other";
  locationMode: "manual" | "current";
  locationText: string;
  formattedAddress: string;
  lat: number | null;
  lng: number | null;
  mapsUrl: string;
};

type AddressFormDrawerProps = {
  addressForm: AddressFormValue;
  addressSearch: string;

  googleSearchReady: boolean;
  searchingAddress: boolean;
  savingAddress: boolean;

  addressMessage: string | null;
  locationMessage: string | null;

  addressInputRef: Ref<HTMLInputElement>;
  googleMapRef: Ref<HTMLDivElement>;

  setAddressForm: Dispatch<SetStateAction<AddressFormValue>>;
  setAddressSearch: (value: string) => void;

  onSearch: () => void;
  onCurrentLocation: () => void;
  onSave: () => void;
  onClose: () => void;
};

const inputClass =
  "mb-input h-12 w-full rounded-2xl px-4 text-sm font-medium";

export default function AddressFormDrawer({
  addressForm,
  addressSearch,
  googleSearchReady,
  searchingAddress,
  savingAddress,
  addressMessage,
  locationMessage,
  addressInputRef,
  googleMapRef,
  setAddressForm,
  setAddressSearch,
  onSearch,
  onCurrentLocation,
  onSave,
  onClose,
}: AddressFormDrawerProps) {
  const updateField = <Key extends keyof AddressFormValue>(
    key: Key,
    value: AddressFormValue[Key]
  ) => {
    setAddressForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleSearchKeyDown = (
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    onSearch();
  };

  const hasPinnedLocation =
    addressForm.lat !== null && addressForm.lng !== null;

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="Close address panel"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <aside className="mb-divider absolute bottom-0 left-0 flex max-h-[95dvh] w-full flex-col overflow-hidden rounded-t-[32px] border-t bg-[var(--mb-bg-secondary)] shadow-[var(--mb-shadow-large)] md:bottom-auto md:top-0 md:h-full md:max-h-full md:w-[600px] md:rounded-none md:border-r md:border-t-0">
        <header className="mb-divider flex items-center justify-between gap-4 border-b p-5 sm:p-6">
          <div>
            <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.17em]">
              Delivery location
            </p>

            <h2 className="mb-text mt-1 text-2xl font-light tracking-[-0.04em]">
              Save address
            </h2>

            <p className="mb-text-muted mt-2 text-xs leading-5">
              Search, pin and complete your exact delivery address.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="mb-outline-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          >
            <X size={18} />
          </button>
        </header>

        <div className="mb-themed-scrollbar flex-1 overflow-y-auto p-4 pb-[max(24px,env(safe-area-inset-bottom))] sm:p-6">
          <section className="mb-glass rounded-[26px] p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="mb-accent-surface flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                <Search size={17} />
              </span>

              <div>
                <p className="mb-text text-sm font-medium">Search location</p>

                <p className="mb-text-faint mt-1 text-[10px]">
                  Search manually or use your current position.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                ref={addressInputRef}
                value={addressSearch}
                onChange={(event) => setAddressSearch(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={
                  googleSearchReady
                    ? "Search exact delivery address..."
                    : "Loading Google Maps..."
                }
                className={inputClass}
              />

              <button
                type="button"
                onClick={onSearch}
                disabled={searchingAddress}
                className="mb-primary-button inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium disabled:opacity-40"
              >
                {searchingAddress ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}

                {searchingAddress ? "Searching..." : "Search"}
              </button>
            </div>

            <button
              type="button"
              onClick={onCurrentLocation}
              className="mb-outline-button mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-medium"
            >
              <Navigation size={16} />
              Use current location
            </button>

            {hasPinnedLocation && (
              <div className="mb-divider mt-4 overflow-hidden rounded-[22px] border">
                <div className="relative h-[270px] w-full">
                  <div ref={googleMapRef} className="h-full w-full" />

                  <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1.5 text-[9px] font-medium text-white backdrop-blur-xl">
                    Drag the pin or tap the map
                  </div>
                </div>
              </div>
            )}

            {addressForm.formattedAddress && (
              <div className="mb-glass-subtle mt-4 rounded-[18px] p-3">
                <p className="mb-text-faint text-[9px] font-semibold uppercase tracking-[0.14em]">
                  Selected location
                </p>

                <p className="mb-text mt-2 text-xs leading-5">
                  {addressForm.formattedAddress}
                </p>
              </div>
            )}

            {locationMessage && (
              <MessageBox type="error" message={locationMessage} />
            )}
          </section>

          <section className="mb-glass mt-4 rounded-[26px] p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="mb-accent-surface flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                <MapPin size={17} />
              </span>

              <div>
                <p className="mb-text text-sm font-medium">Address details</p>

                <p className="mb-text-faint mt-1 text-[10px]">
                  Complete the required delivery information.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <AddressInput
                placeholder="Full name"
                value={addressForm.fullName}
                onChange={(value) => updateField("fullName", value)}
              />

              <AddressInput
                placeholder="Phone number"
                value={addressForm.phone}
                inputMode="tel"
                onChange={(value) =>
                  updateField(
                    "phone",
                    value.replace(/\D/g, "").slice(0, 10)
                  )
                }
              />

              <AddressInput
                placeholder="Flat / house number"
                value={addressForm.flatNo}
                onChange={(value) => updateField("flatNo", value)}
              />

              <AddressInput
                placeholder="Floor · optional"
                value={addressForm.floor}
                onChange={(value) => updateField("floor", value)}
              />

              <AddressInput
                placeholder="Building / apartment"
                value={addressForm.buildingName}
                onChange={(value) => updateField("buildingName", value)}
              />

              <AddressInput
                placeholder="Area / locality"
                value={addressForm.area}
                onChange={(value) => updateField("area", value)}
              />

              <AddressInput
                placeholder="Landmark · optional"
                value={addressForm.landmark}
                onChange={(value) => updateField("landmark", value)}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <AddressInput
                  placeholder="City"
                  value={addressForm.city}
                  onChange={(value) => updateField("city", value)}
                />

                <AddressInput
                  placeholder="State"
                  value={addressForm.state}
                  onChange={(value) => updateField("state", value)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <AddressInput
                  placeholder="Pincode"
                  value={addressForm.pincode}
                  inputMode="numeric"
                  onChange={(value) =>
                    updateField(
                      "pincode",
                      value.replace(/\D/g, "").slice(0, 6)
                    )
                  }
                />

                <select
                  value={addressForm.addressLabel}
                  onChange={(event) =>
                    updateField(
                      "addressLabel",
                      event.target.value as AddressFormValue["addressLabel"]
                    )
                  }
                  className={inputClass}
                >
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {addressMessage && (
              <MessageBox type="error" message={addressMessage} />
            )}

            <button
              type="button"
              onClick={onSave}
              disabled={savingAddress}
              className="mb-primary-button mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-medium disabled:opacity-40"
            >
              {savingAddress ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Check size={17} />
              )}

              {savingAddress ? "Saving..." : "Save address & continue"}
            </button>
          </section>
        </div>
      </aside>
    </div>
  );
}

function AddressInput({
  placeholder,
  value,
  inputMode,
  onChange,
}: {
  placeholder: string;
  value: string;
  inputMode?: "text" | "numeric" | "tel";
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      inputMode={inputMode}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    />
  );
}

function MessageBox({
  type,
  message,
}: {
  type: "success" | "error";
  message: string;
}) {
  return (
    <div
      className={`mt-3 rounded-[18px] border p-3 text-xs font-medium leading-5 ${
        type === "error"
          ? "mb-danger-message"
          : "mb-success-message"
      }`}
    >
      {message}
    </div>
  );
}