'use client';

import Image from 'next/image';
import { forwardRef, useState } from 'react';

const PasswordField = forwardRef(function PasswordField({ hasError, ...inputProps }, ref) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...inputProps}
        ref={ref}
        className={`input-field pr-14 ${hasError ? 'input-field-error' : ''}`}
        type={visible ? 'text' : 'password'}
      />
      <button
        type="button"
        className="absolute right-4 top-1/2 -translate-y-1/2"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
      >
        <Image
          className="h-6 w-6"
          src={visible ? '/images/btn_visibility_on_24px.png' : '/images/btn_visibility_off_24px.png'}
          width={24}
          height={24}
          alt=""
        />
      </button>
    </div>
  );
});

export default PasswordField;
