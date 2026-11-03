<?php

namespace App\Http\Requests;

use App\Enums\ExportType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExportRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(ExportType::class)],
            'filters' => ['nullable', 'array'],
            'filters.*' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function exportType(): ExportType
    {
        return ExportType::from($this->validated('type'));
    }

    /**
     * @return array<string, mixed>
     */
    public function exportFilters(): array
    {
        return $this->validated('filters') ?? [];
    }
}
